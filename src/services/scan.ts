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
import { configuredAI } from "@/providers/ai";
import { AIUnavailableError } from "@/providers/ai/types";
import { objectStore } from "@/providers/storage";
import { upsertKitchenItems } from "@/services/kitchen";

const VISION_PROMPT = `You are an ingredient detective looking at a kitchen photo (fridge, freezer, pantry, counter, cabinets, or grocery bags).

Identify edible ingredients and packaged foods that a person could cook with.
For each item return:
- name (common cooking name)
- approximate quantity only if the photo actually supports it
- quantityNote when you can see "about 6 eggs" but not an exact count
- location guess
- brand only if clearly visible and useful
- packageSize if readable
- freshness only if reasonably inferable (wilted greens, mold, etc.)
- confidence 0-1
- likelyUsable
- isStaple
Do NOT invent exact counts. Do NOT invent items you cannot see. Packaged foods are allowed.
Return JSON matching the provided schema. commentary should sound like a warm, observant friend — never robotic, never "I don't know".`;

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
  return ai.completeStructured({
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
  });
}

export async function scanPhotos(userId: string, files: File[], locationHint?: KitchenLocation) {
  const store = objectStore();
  const analyses = [];
  const detections: IngredientDetection[][] = [];

  for (const file of files) {
    const processed = await processUpload(file);
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

    try {
      const analysis = await analyzeImage(processed.bytes, processed.mimeType, locationHint);
      analyses.push(analysis);
      detections.push(analysis.items);
    } catch (error) {
      logger.warn("scan.vision_failed", { error: String(error) });
    }
  }

  const merged = mergeDetections(detections);
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
    analyses.map((item) => item.commentary).filter(Boolean)[0] ||
    (merged.length
      ? undefined
      : "I can make out most of this, but I want to make sure I don't send you cooking with something you don't actually have. Tell me what you see, or scan another shelf.");

  return {
    items: saved,
    detections: merged,
    speech: seenKitchenSpeech(
      saved.map((item) => ({
        canonicalId: item.canonicalId,
        name: item.name,
        confidence: item.confidence,
        isUsable: item.isUsable,
      })),
      commentary,
    ),
    usedVision: Boolean(configuredAI()) && analyses.length > 0,
  };
}

export const ManualScanSchema = z.object({
  text: z.string().min(2),
  location: z.enum(["fridge", "freezer", "pantry", "counter", "cabinet", "unknown"]).optional(),
});
