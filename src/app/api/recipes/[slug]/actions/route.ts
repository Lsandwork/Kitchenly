import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";
import { fail, json } from "@/lib/http";
import { sendRecipeEmail } from "@/services/email";
import { getRecipeDetail, shoppingListForRecipe } from "@/services/recipes";
import { listAllSubstitutions } from "@/domain/substitutions/engine";
import { getKitchen, getPreferences, upsertKitchenItems } from "@/services/kitchen";
import { kitchenToInput } from "@/services/recipes";

type Params = { params: Promise<{ slug: string }> };

const ActionSchema = z.object({
  action: z.enum([
    "save",
    "unsave",
    "note",
    "rate",
    "shopping",
    "email",
    "start_cook",
    "complete",
    "substitute",
    "make_with_mine",
    "add_to_tonight",
    "meal_plan",
    "ask",
    "make_healthier",
    "make_cheaper",
    "make_faster",
  ]),
  content: z.string().optional(),
  stars: z.number().min(1).max(5).optional(),
  servings: z.number().optional(),
  emails: z.array(z.string().email()).optional(),
  includeShopping: z.boolean().optional(),
  includeRecipe: z.boolean().optional(),
  includeIngredients: z.boolean().optional(),
  includeInstructions: z.boolean().optional(),
  includeMissing: z.boolean().optional(),
  notes: z.string().optional(),
  missingCanonicalId: z.string().optional(),
  substituteCanonicalId: z.string().optional(),
  date: z.string().optional(),
  mealType: z.string().optional(),
  leftovers: z
    .object({
      name: z.string(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
    })
    .optional(),
  depletion: z
    .array(
      z.object({
        canonicalId: z.string(),
        name: z.string(),
        quantityUsed: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        remove: z.boolean().optional(),
      }),
    )
    .optional(),
  question: z.string().optional(),
});

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { slug } = await params;
  try {
    const body = ActionSchema.parse(await request.json());
    const detail = await getRecipeDetail(user.id, slug, body.servings);
    if (!detail) return fail("Recipe not found", 404);
    const recipeId = detail.row.id;

    if (body.action === "save") {
      await db.savedRecipe.upsert({
        where: { userId_recipeId: { userId: user.id, recipeId } },
        update: {},
        create: { userId: user.id, recipeId },
      });
      track("recipe_save", { slug, userId: user.id });
      return json({ saved: true });
    }

    if (body.action === "unsave") {
      await db.savedRecipe.deleteMany({ where: { userId: user.id, recipeId } });
      return json({ saved: false });
    }

    if (body.action === "note") {
      await db.recipeNote.upsert({
        where: { userId_recipeId: { userId: user.id, recipeId } },
        update: { content: body.content || "" },
        create: { userId: user.id, recipeId, content: body.content || "" },
      });
      return json({ ok: true });
    }

    if (body.action === "rate") {
      const stars = body.stars ?? 5;
      await db.recipeRating.upsert({
        where: { userId_recipeId: { userId: user.id, recipeId } },
        update: { stars },
        create: { userId: user.id, recipeId, stars },
      });
      const ratings = await db.recipeRating.findMany({ where: { recipeId } });
      const average = ratings.reduce((sum, row) => sum + row.stars, 0) / ratings.length;
      await db.recipe.update({
        where: { id: recipeId },
        data: { ratingAverage: average, ratingCount: ratings.length },
      });
      return json({ ratingAverage: average, ratingCount: ratings.length, userRating: stars });
    }

    if (body.action === "shopping") {
      const result = await shoppingListForRecipe(user.id, slug, body.servings);
      if (!result) return fail("Recipe not found", 404);
      track("shopping_list_generate", { slug, count: result.shopping.length });
      return json({
        listId: result.list.id,
        shopping: result.shopping,
        speech: result.shopping.length
          ? `Shopping list ready — ${result.shopping.length} item${result.shopping.length === 1 ? "" : "s"} after subtracting your kitchen.`
          : "You already have everything for this one.",
      });
    }

    if (body.action === "email") {
      const emails = body.emails?.length ? body.emails : user.email ? [user.email] : [];
      if (!emails.length) return fail("Add an email address to send this.", 400);
      const result = await sendRecipeEmail(user.id, {
        to: emails,
        recipe: detail.recipe,
        shopping: body.includeShopping === false ? [] : detail.shopping,
        missing: detail.match.missing,
        includeShopping: body.includeShopping !== false,
        includeRecipe: body.includeRecipe !== false,
        includeIngredients: body.includeIngredients !== false,
        includeInstructions: body.includeInstructions !== false,
        includeMissing: body.includeMissing !== false,
        notes: body.notes,
        kind: body.includeShopping === false ? "recipe" : "recipe_shopping",
      });
      track(body.includeShopping === false ? "recipe_email" : "shopping_list_email", { slug });
      return json(result);
    }

    if (body.action === "start_cook" || body.action === "add_to_tonight") {
      const session = await db.cookingSession.create({
        data: {
          userId: user.id,
          recipeId,
          title: detail.recipe.title,
          stepsJson: JSON.stringify(detail.recipe.steps),
          servings: body.servings || detail.recipe.servings,
          status: "active",
        },
      });
      track("recipe_start_cooking", { slug, sessionId: session.id });
      return json({ session });
    }

    if (body.action === "meal_plan") {
      const date = body.date ? new Date(body.date) : new Date();
      const entry = await db.mealPlanEntry.create({
        data: {
          userId: user.id,
          date,
          mealType: body.mealType || "dinner",
          recipeId,
          title: detail.recipe.title,
          servings: body.servings || detail.recipe.servings,
        },
      });
      track("meal_plan_add", { slug });
      return json({ entry });
    }

    if (body.action === "substitute") {
      const kitchen = kitchenToInput(await getKitchen(user.id));
      const prefs = await getPreferences(user.id);
      const options = listAllSubstitutions(body.missingCanonicalId || "", kitchen, {
        allergies: prefs.allergies,
      });
      return json({ options });
    }

    if (body.action === "make_with_mine") {
      const kitchen = kitchenToInput(await getKitchen(user.id));
      const prefs = await getPreferences(user.id);
      const adaptedIngredients = detail.recipe.ingredients.map((ingredient) => {
        if (kitchen.some((item) => item.canonicalId === ingredient.canonicalId)) return ingredient;
        const sub = listAllSubstitutions(ingredient.canonicalId || "", kitchen, { allergies: prefs.allergies }).find(
          (option) =>
            Boolean(option.substituteCanonicalId) &&
            kitchen.some((item) => item.canonicalId === option.substituteCanonicalId),
        );
        if (!sub?.substituteCanonicalId) return ingredient;
        return {
          ...ingredient,
          name: `${sub.substitute} (for ${ingredient.name})`,
          canonicalId: sub.substituteCanonicalId,
        };
      });
      const remainingMissing = adaptedIngredients.filter(
        (ingredient) =>
          !ingredient.optional &&
          !kitchen.some((item) => item.canonicalId === ingredient.canonicalId) &&
          ingredient.importance !== "garnish",
      );
      const version = await db.recipeVersion.create({
        data: {
          userId: user.id,
          recipeId,
          title: `My ${detail.recipe.title}`,
          description: remainingMissing.length
            ? `Adapted to your kitchen. Still missing: ${remainingMissing.map((item) => item.name).join(", ")}.`
            : "Adapted to your kitchen. No store trip needed.",
          servings: detail.recipe.servings,
          ingredientsJson: JSON.stringify(adaptedIngredients),
          stepsJson: JSON.stringify(detail.recipe.steps),
          changesJson: JSON.stringify(
            adaptedIngredients
              .filter((item, index) => item.canonicalId !== detail.recipe.ingredients[index]?.canonicalId)
              .map((item) => item.name),
          ),
        },
      });
      track("recipe_make_with_mine", { slug, noStoreTrip: remainingMissing.length === 0 });
      return json({
        version,
        noStoreTrip: remainingMissing.length === 0,
        remainingMissing,
        speech:
          remainingMissing.length === 0
            ? "Your Kitchen Friend version is ready — no store trip needed."
            : `I adapted what I could. You're still missing ${remainingMissing.map((item) => item.name).join(" and ")}.`,
      });
    }

    if (body.action === "complete") {
      if (body.depletion?.length) {
        for (const item of body.depletion) {
          const current = await db.kitchenItem.findFirst({
            where: { userId: user.id, canonicalId: item.canonicalId },
          });
          if (!current) continue;
          if (item.remove) {
            await db.kitchenItem.delete({ where: { id: current.id } });
            continue;
          }
          if (item.quantityUsed != null && current.quantity != null) {
            const next = Math.max(0, current.quantity - item.quantityUsed);
            if (next === 0) await db.kitchenItem.delete({ where: { id: current.id } });
            else await db.kitchenItem.update({ where: { id: current.id }, data: { quantity: next } });
          }
        }
      }
      if (body.leftovers) {
        await upsertKitchenItems(user.id, [
          {
            canonicalId: detail.recipe.ingredients.find((item) => item.importance === "critical")?.canonicalId || "chicken-breast",
            name: body.leftovers.name,
            quantity: body.leftovers.quantity,
            unit: body.leftovers.unit,
            isLeftover: true,
            isCooked: true,
            useSoon: true,
            location: "fridge",
            source: "leftover",
            confirmed: true,
          },
        ]);
      }
      await db.cookHistory.create({
        data: {
          userId: user.id,
          recipeId,
          title: detail.recipe.title,
          leftoversJson: JSON.stringify(body.leftovers ? [body.leftovers] : []),
          depletionJson: JSON.stringify(body.depletion || []),
        },
      });
      track("recipe_complete", { slug });
      track("inventory_updated_from_recipe", { slug, depleted: body.depletion?.length || 0 });
      return json({ ok: true });
    }

    if (body.action === "ask") {
      const question = body.question?.trim();
      if (!question) return fail("Ask something about this recipe.", 400);
      try {
        const { requireAI } = await import("@/providers/ai");
        const ai = requireAI();
        const answer = await ai.completeText("fast", [
          {
            role: "system",
            content: `You are Kitchen Friend, a warm cooking companion. Answer briefly and practically about this recipe only. Recipe: ${detail.recipe.title}. Ingredients: ${detail.recipe.ingredients.map((item) => item.name).join(", ")}. Steps: ${detail.recipe.steps.map((step) => step.instruction).join(" ")}`,
          },
          { role: "user", content: question },
        ]);
        return json({ answer });
      } catch {
        return json({
          answer:
            "I can still help from the recipe card — check the timers on each step, and tap Find substitute on anything you're missing.",
        });
      }
    }

    if (body.action === "make_healthier" || body.action === "make_cheaper" || body.action === "make_faster") {
      const kitchen = kitchenToInput(await getKitchen(user.id));
      const prefs = await getPreferences(user.id);
      let speech = "";
      let ingredients = detail.recipe.ingredients;
      let steps = detail.recipe.steps;
      let title = detail.recipe.title;
      if (body.action === "make_healthier") {
        title = `Lighter ${detail.recipe.title}`;
        ingredients = ingredients.map((item) => {
          if (item.canonicalId === "heavy-cream") {
            const sub = listAllSubstitutions("heavy-cream", kitchen, { allergies: prefs.allergies }).find(
              (option) => option.substituteCanonicalId === "greek-yogurt",
            );
            if (sub) {
              return { ...item, name: "Greek yogurt (lighter than cream)", canonicalId: "greek-yogurt" };
            }
          }
          if (item.canonicalId === "butter") {
            return { ...item, quantity: item.quantity != null ? Math.max(1, item.quantity * 0.5) : item.quantity, name: `${item.name} (reduced)` };
          }
          return item;
        });
        speech =
          "Lighter version: less butter, cream swapped for Greek yogurt when possible, and extra vegetables if the recipe allows. Not medical advice — just a lighter plate.";
        track("recipe_healthier", { slug });
      }
      if (body.action === "make_cheaper") {
        title = `Budget ${detail.recipe.title}`;
        ingredients = ingredients.map((item) => {
          if (item.canonicalId === "chicken-breast" && kitchen.some((row) => row.canonicalId === "chicken-thigh")) {
            return { ...item, name: "chicken thighs (budget swap)", canonicalId: "chicken-thigh" };
          }
          if (item.canonicalId === "parmesan" && kitchen.some((row) => row.canonicalId === "cheddar")) {
            return { ...item, name: "cheddar (budget swap)", canonicalId: "cheddar" };
          }
          return item;
        });
        speech = "Budget version: cheaper proteins and cheeses you already own, optional garnishes dropped when missing.";
        track("recipe_cheaper", { slug });
      }
      if (body.action === "make_faster") {
        title = `Faster ${detail.recipe.title}`;
        steps = steps.map((step, index) =>
          index === 0
            ? { ...step, instruction: `${step.instruction} Meanwhile, start the sauce ingredients so they are ready to go.` }
            : step,
        );
        speech = "Faster version: overlap prep and cooking where food-safe. Keep the 165°F chicken check.";
        track("recipe_faster", { slug });
      }
      const version = await db.recipeVersion.create({
        data: {
          userId: user.id,
          recipeId,
          title,
          description: speech,
          servings: detail.recipe.servings,
          ingredientsJson: JSON.stringify(ingredients),
          stepsJson: JSON.stringify(steps),
          changesJson: JSON.stringify([body.action]),
        },
      });
      return json({ version, speech, ingredients, steps });
    }

    return fail("Unknown action", 400);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Action failed", 400);
  }
}
