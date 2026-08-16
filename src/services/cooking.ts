import { cookingCoachLine } from "@/domain/personality/voice";
import { scaleRecipe } from "@/domain/recipes/scale";
import type { RecipeRecord } from "@/domain/types";
import { db } from "@/lib/db";
import { configuredAI } from "@/providers/ai";
import { PERSONALITY_SYSTEM } from "@/domain/personality/voice";

export async function startCooking(userId: string, recipe: RecipeRecord, servings?: number) {
  const scaled = servings ? scaleRecipe(recipe, servings) : recipe;
  return db.cookingSession.create({
    data: {
      userId,
      recipeId: null,
      title: scaled.title,
      servings: scaled.servings,
      stepsJson: JSON.stringify(scaled.steps),
      currentStep: 0,
      status: "active",
    },
  });
}

export async function getSession(userId: string, id: string) {
  const session = await db.cookingSession.findFirst({ where: { id, userId } });
  if (!session) return null;
  return { ...session, steps: JSON.parse(session.stepsJson) as RecipeRecord["steps"] };
}

export async function advanceSession(userId: string, id: string, delta: number) {
  const session = await getSession(userId, id);
  if (!session) throw new Error("That cooking session wandered off.");
  const next = Math.min(Math.max(0, session.currentStep + delta), session.steps.length - 1);
  return db.cookingSession.update({ where: { id: session.id }, data: { currentStep: next } });
}

export async function completeSession(userId: string, id: string) {
  return db.cookingSession.update({
    where: { id },
    data: { status: "done", completedAt: new Date() },
  });
}

export async function askDuringCook(userId: string, sessionId: string, question: string) {
  const session = await getSession(userId, sessionId);
  if (!session) throw new Error("Start cooking first.");
  const step = session.steps[session.currentStep];
  const fallback = cookingCoachLine(session.currentStep, session.steps.length, step.instruction, step.tip);
  const ai = configuredAI();
  if (!ai) {
    if (/done|how do i know/.test(question.toLowerCase())) {
      return "You're looking for color and a just-firm texture — if it's chicken, the juices should run clear and the thickest part should be opaque. Give it another minute if you're unsure; you can always cut into the thickest piece.";
    }
    return fallback;
  }
  return ai.completeText("fast", [
    { role: "system", content: PERSONALITY_SYSTEM },
    {
      role: "user",
      content: `The cook is on step ${session.currentStep + 1} of ${session.steps.length}: ${step.instruction}. Recipe: ${session.title}. Question: ${question}`,
    },
  ]);
}
