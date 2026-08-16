import { z } from "zod";
import { ChatIntentSchema, type ChatIntent, type ConversationCard, type RankedRecipe } from "@/domain/types";
import { emptyKitchenSpeech, noStoreTripSpeech, PERSONALITY_SYSTEM, stripDeadEnds } from "@/domain/personality/voice";
import { parseIngredientText } from "@/domain/ingredients/parse";
import { db } from "@/lib/db";
import { configuredAI } from "@/providers/ai";
import { addFromText, getKitchen, getPreferences, removeIngredients, toKitchenInputs } from "@/services/kitchen";
import { recommendMeals, serializeRecipe, type RecommendOptions } from "@/services/recommend";

function heuristicIntent(text: string): ChatIntent {
  const lower = text.toLowerCase();
  const ingredients = parseIngredientText(text).map((item) => item.name);
  if (/what'?s left|leftover|from last night/.test(lower)) {
    return { intent: "leftovers", ingredients, removeIngredients: [], constraints: { leftoverMode: true } };
  }
  if (/don'?t want to go to the store|no store|don'?t want to shop/.test(lower)) {
    return { intent: "recommend", ingredients: [], removeIngredients: [], constraints: {}, speechHint: noStoreTripSpeech() };
  }
  if (/healthier/.test(lower)) return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { healthier: true } };
  if (/faster|only have \d+ minutes|20 minutes|quick/.test(lower)) {
    const minutes = Number(lower.match(/(\d+)\s*minutes?/)?.[1] ?? 20);
    return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { faster: true, maxMinutes: minutes } };
  }
  if (/air fryer/.test(lower)) return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { equipment: "air-fryer" } };
  if (/cooking for (\d+)/.test(lower)) {
    return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { servings: Number(lower.match(/cooking for (\d+)/)?.[1]) } };
  }
  if (/kid friendly|kid-friendly/.test(lower)) return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { kidFriendly: true } };
  if (/impressive/.test(lower)) return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { impressive: true } };
  if (/easiest/.test(lower)) return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { easiest: true } };
  if (/spicy|make it spicy/.test(lower)) return { intent: "modify_recipe", ingredients: [], removeIngredients: [], constraints: { spicy: true } };
  if (/i don'?t want ([a-z\s]+)/.test(lower)) {
    const name = lower.match(/i don'?t want ([a-z\s]+)/)?.[1]?.trim() ?? "";
    return { intent: "modify_recipe", ingredients: [], removeIngredients: [name], constraints: { noIngredient: [name] } };
  }
  if (/remove the ([a-z\s]+)|i used the ([a-z\s]+)|i used it/.test(lower)) {
    const name = lower.match(/remove the ([a-z\s]+)|i used the ([a-z\s]+)/)?.[1] ?? ingredients[0];
    return { intent: "remove_ingredients", ingredients: [], removeIngredients: name ? [name] : ingredients, constraints: {} };
  }
  if (/still have everything except/.test(lower)) {
    return { intent: "remove_ingredients", ingredients: [], removeIngredients: ingredients, constraints: {} };
  }
  if (/find these locally|shop|instacart|store/.test(lower)) {
    return { intent: "shop", ingredients: [], removeIngredients: [], constraints: {} };
  }
  if (/let'?s cook|start cooking/.test(lower)) return { intent: "cook", ingredients: [], removeIngredients: [], constraints: {} };
  if (/i have |i've got |got some /.test(lower) || ingredients.length >= 2) {
    return { intent: "add_ingredients", ingredients, removeIngredients: [], constraints: {} };
  }
  if (/mexican|italian|thai|indian|chinese|pad thai/.test(lower) || /high-protein|high protein/.test(lower)) {
    const cuisine = lower.match(/mexican|italian|thai|indian|chinese/)?.[0];
    return { intent: "search", ingredients, removeIngredients: [], constraints: { cuisine }, speechHint: text };
  }
  if (/what should i make|what can i make|no idea|figure it out/.test(lower)) {
    return { intent: "recommend", ingredients: [], removeIngredients: [], constraints: {} };
  }
  return { intent: "recommend", ingredients, removeIngredients: [], constraints: {} };
}

async function interpret(text: string): Promise<ChatIntent> {
  const ai = configuredAI();
  if (!ai) return heuristicIntent(text);
  try {
    return await ai.completeStructured({
      task: "fast",
      schemaName: "ChatIntent",
      schema: ChatIntentSchema,
      messages: [
        { role: "system", content: "Parse the user's kitchen message into a structured intent. JSON only." },
        { role: "user", content: text },
      ],
    });
  } catch {
    return heuristicIntent(text);
  }
}

async function polishSpeech(speech: string, context: unknown) {
  const ai = configuredAI();
  if (!ai) return stripDeadEnds(speech);
  try {
    const polished = await ai.completeText("fast", [
      { role: "system", content: PERSONALITY_SYSTEM },
      { role: "user", content: `Rewrite this in your voice without changing the facts:\n${speech}\n\nContext: ${JSON.stringify(context).slice(0, 1500)}` },
    ]);
    return stripDeadEnds(polished || speech);
  } catch {
    return stripDeadEnds(speech);
  }
}

function recipeCards(pick: RankedRecipe | null, alternatives: RankedRecipe[]): ConversationCard[] {
  const cards: ConversationCard[] = [];
  if (pick) cards.push({ kind: "recipe", recipe: pick });
  cards.push({
    kind: "actions",
    actions: [
      { id: "cook", label: "Let's cook" },
      { id: "more", label: "Give me 3 more" },
      { id: "healthier", label: "Something healthier" },
      { id: "faster", label: "Something faster" },
      { id: "shop", label: "Find these locally" },
    ],
  });
  for (const recipe of alternatives.slice(0, 2)) cards.push({ kind: "recipe", recipe });
  return cards;
}

export async function converse(userId: string, text: string, conversationId?: string) {
  let conversation = conversationId
    ? await db.conversation.findFirst({ where: { id: conversationId, userId } })
    : null;
  if (!conversation) {
    conversation = await db.conversation.create({ data: { userId, title: text.slice(0, 60) } });
  }
  await db.message.create({ data: { conversationId: conversation.id, role: "user", content: text } });

  const intent = await interpret(text);
  if (intent.intent === "add_ingredients" && intent.ingredients.length) {
    await addFromText(userId, text);
  }
  if (intent.intent === "remove_ingredients" && intent.removeIngredients.length) {
    await removeIngredients(userId, intent.removeIngredients);
  }
  if (intent.intent === "leftovers") {
    await addFromText(userId, text);
  }

  const kitchenRows = await getKitchen(userId);
  const kitchen = toKitchenInputs(kitchenRows);
  const prefs = await getPreferences(userId);

  if (!kitchen.length && intent.intent !== "add_ingredients") {
    const speech = emptyKitchenSpeech();
    await db.message.create({ data: { conversationId: conversation.id, role: "assistant", content: speech } });
    return { conversationId: conversation.id, speech, cards: [] as ConversationCard[], intent };
  }

  const options: RecommendOptions = { ...intent.constraints, text: intent.intent === "search" ? text : undefined };
  const result = await recommendMeals(userId, kitchen, prefs, options);
  const speech = await polishSpeech(intent.speechHint ? `${intent.speechHint} ${result.speech}` : result.speech, {
    kitchen: kitchen.map((item) => item.name),
    pick: result.pick?.recipe.title,
  });
  const cards = recipeCards(result.pick, result.alternatives);
  await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: speech,
      cardsJson: JSON.stringify(cards.map((card) => (card.kind === "recipe" ? { kind: "recipe", id: card.recipe.recipe.id } : card))),
    },
  });

  return {
    conversationId: conversation.id,
    speech,
    intent,
    cards: cards.map((card) =>
      card.kind === "recipe" ? { kind: "recipe" as const, recipe: serializeRecipe(card.recipe) } : card,
    ),
    pick: result.pick ? serializeRecipe(result.pick) : null,
    alternatives: result.alternatives.map(serializeRecipe),
  };
}

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});
