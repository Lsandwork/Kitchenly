import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { advanceSession, askDuringCook, completeSession, getSession, startCooking } from "@/services/cooking";
import type { RecipeRecord } from "@/domain/types";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();
  if (body.action === "start") {
    const recipe = body.recipe as RecipeRecord;
    if (!recipe?.title || !recipe.steps) return fail("I need a recipe to cook.");
    const session = await startCooking(user.id, recipe, body.servings);
    return json({ session });
  }
  if (body.action === "next") {
    const session = await advanceSession(user.id, body.id, 1);
    return json({ session });
  }
  if (body.action === "prev") {
    const session = await advanceSession(user.id, body.id, -1);
    return json({ session });
  }
  if (body.action === "complete") {
    const session = await completeSession(user.id, body.id);
    return json({ session });
  }
  if (body.action === "ask") {
    const answer = await askDuringCook(user.id, body.id, body.question);
    return json({ answer });
  }
  return fail("Unknown cooking action");
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return fail("Which session?");
  const session = await getSession(user.id, id);
  if (!session) return fail("That cook already finished.", 404);
  return json({ session });
}
