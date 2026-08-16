import type { KitchenItemInput, RankedRecipe, RecipeState } from "@/domain/types";
import { perishabilityUrgency } from "@/domain/matching/score";

const DEAD_ENDS = [
  "i don't know",
  "i do not know",
  "i don't understand",
  "i can't help",
  "i cannot help",
  "i'm unable",
  "i am unable",
  "insufficient information",
  "i cannot find anything",
  "sorry, i don't know",
];

export function stripDeadEnds(text: string) {
  const lower = text.toLowerCase();
  if (DEAD_ENDS.some((phrase) => lower.includes(phrase))) {
    return "Let me work with what we've got and get you to a real dinner.";
  }
  return text;
}

export function listNames(items: { name: string }[], limit = 6) {
  const names = items.slice(0, limit).map((item) => item.name);
  if (names.length === 0) return "almost nothing";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function urgentIngredient(kitchen: KitchenItemInput[]) {
  return [...kitchen].sort((a, b) => perishabilityUrgency(b) - perishabilityUrgency(a))[0];
}

export function seenKitchenSpeech(kitchen: KitchenItemInput[], commentary?: string) {
  const useful = kitchen.filter((item) => item.isUsable !== false);
  if (useful.length === 0) {
    return "I can make out the shelves, but I don't want to guess you into a bad dinner. Tell me what you actually have — even a messy list is enough.";
  }
  const uncertain = useful.filter((item) => (item.confidence ?? 1) < 0.7);
  const sure = useful.filter((item) => (item.confidence ?? 1) >= 0.7);
  const head = commentary?.trim()
    ? stripDeadEnds(commentary)
    : `Alright, you've got ${listNames(sure.length ? sure : useful)}. You're better stocked than you think.`;
  if (uncertain.length) {
    return `${head} I want to make sure I don't send you cooking with something you don't actually have — tap anything I got wrong, especially ${listNames(uncertain, 3)}.`;
  }
  return head;
}

export function whySpeech(recipe: RankedRecipe, kitchen: KitchenItemInput[]) {
  const urgent = urgentIngredient(kitchen);
  if (recipe.state === "make_now" && urgent && perishabilityUrgency(urgent) >= 0.7) {
    return `Picked this because you already have everything, and it'll use the ${urgent.name} first.`;
  }
  if (recipe.state === "make_now") {
    return "Picked this because you already have everything.";
  }
  if (recipe.missingIngredients.length === 1) {
    return `This is almost ready — you only need ${recipe.missingIngredients[0].name}.`;
  }
  if (recipe.substitutions.length) {
    return `You can make this if you're okay using ${recipe.substitutions[0].substitute} instead of ${recipe.substitutions[0].original}.`;
  }
  return recipe.whyPicked;
}

export function recommendSpeech(pick: RankedRecipe, kitchen: KitchenItemInput[], alternatives: RankedRecipe[]) {
  const urgent = urgentIngredient(kitchen);
  const time = pick.recipe.totalMinutes ? `they're about ${pick.recipe.totalMinutes} minutes` : "they come together quickly";
  let line: string;
  if (pick.type === "generated") {
    line = `I couldn't find a great existing recipe that fits what you've got, so I built one around your kitchen. ${pick.recipe.title}. ${time[0].toUpperCase()}${time.slice(1)}.`;
  } else if (pick.state === "make_now") {
    line = `I'd make the ${pick.recipe.title.toLowerCase()} tonight. You already have everything, ${time}`;
    if (urgent && perishabilityUrgency(urgent) >= 0.45) {
      line += `, and they'll use the ${urgent.name} that's probably closest to needing attention`;
    }
    line += ".";
  } else if (pick.missingIngredients.length === 1) {
    const missing = pick.missingIngredients[0];
    const sub = pick.substitutions[0];
    line = `You're one ingredient away from ${pick.recipe.title.toLowerCase()}. The only thing standing between you and this is ${missing.name}.`;
    if (sub) line += ` And honestly, ${sub.explanation}`;
  } else {
    line = `${pick.recipe.title} is the least-friction good dinner I can see. ${whySpeech(pick, kitchen)}`;
  }
  if (alternatives.length) {
    line += alternatives.length === 1
      ? " If that doesn't sound like you tonight, I've got another idea."
      : ` If that doesn't sound like you tonight, I've got ${alternatives.length} other ideas.`;
  }
  return stripDeadEnds(line);
}

export function emptyKitchenSpeech() {
  return "Okay, kitchen inspection time. Give me a photo of the fridge — or just tell me what you've got — and I'll figure it out.";
}

export function noStoreTripSpeech() {
  return "Then we're not going to the store. Let me find something you can make entirely from what you've already got.";
}

export function cookingCoachLine(stepIndex: number, total: number, instruction: string, tip?: string) {
  const opener =
    stepIndex === 0
      ? "Alright, you're in it now."
      : stepIndex === total - 1
        ? "Last bit. You're doing great."
        : "You're doing great.";
  return tip ? `${opener} ${instruction} ${tip}` : `${opener} ${instruction}`;
}

export function stateLabel(state: RecipeState) {
  if (state === "make_now") return "You can make this right now";
  if (state === "created_for_you") return "I made this one for your kitchen";
  return "You're almost there";
}

export function feedbackPrompt() {
  return "How was it? Be honest — it helps me stop suggesting the wrong things.";
}

export const PERSONALITY_SYSTEM = `You are Kitchen Friend: a brilliant personal chef who also happens to be the user's warm, practical best friend.

Voice:
- Warm, witty, observant, confident, conversational.
- Occasionally playful. Never obnoxious, never corporate, never robotic.
- Never excessively enthusiastic. No "AI magic." No scoring language.
- Speak like a person. Short paragraphs. Opinions are welcome.

Hard rules:
- Never say you don't know, can't help, don't understand, or lack information. Take a useful next action instead.
- Never invent store inventory, prices, hours, ratings, or recipe sources.
- Never present a generated recipe as a published one.
- Allergies are hard constraints. Preferences are soft.
- Make a recommendation. Then offer alternatives.
- Stay grounded in the provided kitchen, recipe, shopping list, and cooking step.
- Do not dump 10 options. Pick one, then mention one or two backups.

Transform structured results into natural speech. Do not mention scores, models, or pipelines.`;
