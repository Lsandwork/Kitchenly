import { nanoid } from "nanoid";
import { z } from "zod";
import { getIngredient } from "@/domain/ingredients/catalog";
import { normalizeIngredientName } from "@/domain/ingredients/normalize";
import { seenKitchenSpeech } from "@/domain/personality/voice";
import { VisionAnalysisSchema, type IngredientDetection, type KitchenLocation } from "@/domain/types";
import { scanRetentionDays } from "@/lib/env";
import { db } from "@/lib/db";
import { processUpload, toBase64 } from "@/lib/images";
import { logger } from "@/lib/logger";
import { listAllSubstitutions } from "@/domain/substitutions/engine";
import { configuredAI, withAIFallback } from "@/providers/ai";
import { AIUnavailableError } from "@/providers/ai/types";
import { objectStore } from "@/providers/storage";
import { upsertKitchenItems } from "@/services/kitchen";
import { matchKitchenRecipes } from "@/services/recipes";

type ScanRecipeIdea = {
  slug: string;
  title: string;
  imageUrl?: string | null;
  totalMinutes?: number | null;
  kitchenMatchPercent: number;
  why: string;
  missing: string[];
  substitutes: Array<{ original: string; substitute: string; explanation: string }>;
};

const SubstituteIdeasSchema = z.object({
  ideas: z
    .array(
      z.object({
        recipeSlug: z.string().optional().catch(""),
        recipeTitle: z.string().optional().catch(""),
        original: z.string(),
        substitute: z.string(),
        explanation: z.string().catch("Works in a pinch."),
      }),
    )
    .default([]),
});

async function aiKitchenSubstitutes(
  kitchenNames: string[],
  recipes: Array<{ slug: string; title: string; missing: string[] }>,
): Promise<Array<{ recipeSlug: string; recipeTitle: string; original: string; substitute: string; explanation: string }>> {
  const ai = configuredAI();
  if (!ai || !recipes.some((recipe) => recipe.missing.length)) return [];

  const payload = recipes
    .filter((recipe) => recipe.missing.length)
    .slice(0, 6)
    .map((recipe) => ({
      slug: recipe.slug,
      title: recipe.title,
      missing: recipe.missing.slice(0, 5),
    }));

  try {
    const result = await withAIFallback("fast", (client) =>
      client.completeStructured({
        task: "fast",
        schemaName: "ScanSubstituteIdeas",
        schema: SubstituteIdeasSchema,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You help home cooks finish recipes with what is already in their kitchen. Prefer substitutes they already own. Keep explanations short and practical. Never invent kitchen items that are not listed. If nothing in the kitchen works, suggest a common cheap swap and say they would need to buy it.",
          },
          {
            role: "user",
            content: JSON.stringify({
              kitchen: kitchenNames,
              recipes: payload,
              instruction:
                "Return up to 2 substitute ideas per recipe for missing ingredients. recipeSlug must match the given slug.",
            }),
          },
        ],
      }),
    );
    return result.ideas
      .filter((idea) => idea.original && idea.substitute)
      .map((idea) => ({
        recipeSlug: idea.recipeSlug || "",
        recipeTitle: idea.recipeTitle || "",
        original: idea.original,
        substitute: idea.substitute,
        explanation: idea.explanation || "Works in a pinch.",
      }));
  } catch (error) {
    logger.warn("scan.substitute_ai_failed", { error: String(error) });
    return [];
  }
}

const VISION_PROMPT = `You are an ingredient detective looking at a kitchen photo (fridge, freezer, pantry, counter, cabinets, or grocery bags).

Identify edible ingredients and packaged foods that a person could cook with.
For each item return:
- name (common cooking name)
- approximate quantity only if the photo actually supports it
- quantityNote when you can see "about 6 eggs" but not an exact count
- location guess (fridge, freezer, pantry, counter, cabinet, or unknown)
- brand only if clearly visible and useful
- packageSize if readable
- freshness only if reasonably inferable (wilted greens, mold, etc.)
- confidence 0-1
- likelyUsable
- isStaple
Do NOT invent exact counts. Do NOT invent items you cannot see. Packaged foods are allowed.
Return JSON with shape:
{
  "locationGuess": "fridge",
  "items": [{ "name": "eggs", "confidence": 0.9, "location": "fridge", "likelyUsable": true }],
  "overallConfidence": 0.85,
  "commentary": "warm friendly observation"
}
commentary should sound like a warm, observant friend — never robotic, never "I don't know".`;

function mergeDetections(groups: IngredientDetection[][]) {
  const merged = new Map<string, IngredientDetection>();
  for (const group of groups) {
    for (const item of group) {
      const normalized = normalizeIngredientName(item.name);
      const key = normalized.canonicalId ?? item.name.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          ...item,
          name: normalized.displayName,
          canonicalIngredientId: normalized.canonicalId,
          confidence: Math.max(item.confidence, normalized.canonicalId ? 0.55 : item.confidence),
        });
        continue;
      }
      existing.confidence = Math.max(existing.confidence, item.confidence);
      existing.quantity = existing.quantity ?? item.quantity;
      existing.quantityNote = existing.quantityNote ?? item.quantityNote;
      existing.brand = existing.brand ?? item.brand;
      existing.notes = [existing.notes, item.notes].filter(Boolean).join(" ");
    }
  }
  return [...merged.values()].sort((a, b) => b.confidence - a.confidence);
}

async function analyzeImage(bytes: Buffer, mimeType: string, locationHint?: string) {
  const ai = configuredAI();
  if (!ai) throw new AIUnavailableError();
  return withAIFallback("vision", (client) =>
    client.completeStructured({
      task: "vision",
      schemaName: "VisionAnalysis",
      schema: VisionAnalysisSchema,
      messages: [
        { role: "system", content: VISION_PROMPT },
        {
          role: "user",
          content: locationHint
            ? `This photo is from the ${locationHint}. Identify ingredients.`
            : "Identify the ingredients in this kitchen photo.",
          images: [{ mimeType, base64: toBase64(bytes) }],
        },
      ],
    }),
  );
}

export async function scanPhotos(userId: string, files: File[], locationHint?: KitchenLocation) {
  if (!configuredAI()) {
    throw new AIUnavailableError(
      "Kitchen Friend needs an AI vision key to read photos. Add OPENAI_API_KEY (or another vision provider), or type your ingredients instead.",
    );
  }

  const store = objectStore();
  const analyses = [];
  const detections: IngredientDetection[][] = [];
  const visionErrors: string[] = [];

  for (const file of files) {
    const processed = await processUpload(file);

    try {
      const analysis = await analyzeImage(processed.bytes, processed.mimeType, locationHint);
      analyses.push(analysis);
      detections.push(analysis.items ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      visionErrors.push(message);
      logger.warn("scan.vision_failed", { error: message });
    }

    // Best-effort photo retention — scan still works if storage fails on serverless.
    try {
      const key = `${userId}/${nanoid()}.jpg`;
      await store.put(key, processed.bytes, processed.mimeType);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + scanRetentionDays());
      await db.kitchenScan.create({
        data: {
          userId,
          locationHint: locationHint ?? null,
          storageKey: key,
          mimeType: processed.mimeType,
          byteSize: processed.bytes.length,
          width: processed.width,
          height: processed.height,
          expiresAt,
        },
      });
    } catch (error) {
      logger.warn("scan.storage_failed", { error: String(error) });
    }
  }

  const merged = mergeDetections(detections);
  if (!merged.length) {
    if (visionErrors.length) {
      throw new Error(
        `I couldn't read that photo clearly (${visionErrors[0]}). Try a brighter shelf photo, or tell me what's there.`,
      );
    }
    throw new Error("I couldn't spot ingredients in that photo. Try a clearer shelf shot, or type what you have.");
  }

  const corrections = await db.ingredientCorrection.findMany({ where: { userId } });
  for (const item of merged) {
    const correction = corrections.find((row) => row.fromName.toLowerCase() === item.name.toLowerCase());
    if (correction) {
      const catalog = getIngredient(correction.toCanonical);
      item.canonicalIngredientId = correction.toCanonical;
      item.name = catalog?.name ?? item.name;
      item.confidence = 1;
    }
  }

  const saved = await upsertKitchenItems(
    userId,
    merged.map((item) => ({
      canonicalId: item.canonicalIngredientId ?? `raw:${item.name.toLowerCase()}`,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      quantityNote: item.quantityNote,
      location: item.location ?? locationHint ?? "unknown",
      category: item.category,
      brand: item.brand,
      packageSize: item.packageSize,
      freshness: item.freshness,
      isStaple: item.isStaple,
      isUsable: item.likelyUsable ?? true,
      confidence: item.confidence,
      source: "scan",
      confirmed: item.confidence >= 0.75,
      notes: item.notes,
    })),
  );

  const commentary =
    analyses.map((item) => item.commentary).filter(Boolean)[0] || undefined;

  // Rank recipes for this kitchen and surface top matches + substitutions.
  let recipeIdeas: ScanRecipeIdea[] = [];
  try {
    const matched = await matchKitchenRecipes(userId);
    recipeIdeas = matched.cards.slice(0, 6).map((card) => {
      const fromMatch = (card.match.substitutions || []).map((sub) => ({
        original: sub.original,
        substitute: sub.substitute,
        explanation: sub.explanation,
      }));
      const fromCatalog = card.match.missing
        .filter((item) => item.canonicalId)
        .flatMap((item) =>
          listAllSubstitutions(item.canonicalId!, matched.kitchen, {
            allergies: matched.prefs.allergies,
          }).slice(0, 1),
        )
        .map((sub) => ({
          original: sub.original,
          substitute: sub.substitute,
          explanation: sub.explanation,
        }));
      const seen = new Set(fromMatch.map((sub) => `${sub.original}|${sub.substitute}`));
      const substitutes = [
        ...fromMatch,
        ...fromCatalog.filter((sub) => {
          const key = `${sub.original}|${sub.substitute}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      ].slice(0, 4);

      return {
        slug: card.recipe.slug,
        title: card.recipe.title,
        imageUrl: card.recipe.imageUrl,
        totalMinutes: card.recipe.totalMinutes,
        kitchenMatchPercent: card.kitchenMatchPercent,
        why: card.why,
        missing: card.match.missing.map((item) => item.name),
        substitutes,
      };
    });

    const aiSubs = await aiKitchenSubstitutes(
      saved.map((item) => item.name),
      recipeIdeas,
    );
    if (aiSubs.length) {
      recipeIdeas = recipeIdeas.map((recipe) => {
        const extras = aiSubs
          .filter(
            (idea) =>
              idea.recipeSlug === recipe.slug ||
              idea.recipeTitle.toLowerCase() === recipe.title.toLowerCase() ||
              (!idea.recipeSlug &&
                idea.recipeTitle &&
                recipe.title.toLowerCase().includes(idea.recipeTitle.toLowerCase())),
          )
          .map(({ original, substitute, explanation }) => ({ original, substitute, explanation }));
        if (!extras.length) return recipe;
        const seen = new Set(recipe.substitutes.map((sub) => `${sub.original}|${sub.substitute}`));
        const merged = [...recipe.substitutes];
        for (const sub of extras) {
          const key = `${sub.original}|${sub.substitute}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(sub);
        }
        return { ...recipe, substitutes: merged.slice(0, 4) };
      });
    }
  } catch (error) {
    logger.warn("scan.recipe_match_failed", { error: String(error) });
  }

  return {
    items: saved,
    detections: merged,
    recipes: recipeIdeas,
    speech: seenKitchenSpeech(
      saved.map((item) => ({
        canonicalId: item.canonicalId,
        name: item.name,
        confidence: item.confidence,
        isUsable: item.isUsable,
      })),
      commentary,
    ),
    usedVision: analyses.length > 0,
  };
}

export const ManualScanSchema = z.object({
  text: z.string().min(2),
  location: z.enum(["fridge", "freezer", "pantry", "counter", "cabinet", "unknown"]).optional(),
});
