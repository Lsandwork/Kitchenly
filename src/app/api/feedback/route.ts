import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { updatePreferences } from "@/services/kitchen";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();
  const feedback = await db.recipeFeedback.create({
    data: {
      userId: user.id,
      recipeId: body.recipeId ?? null,
      rating: body.rating,
      comment: body.comment ?? null,
    },
  });
  if (body.rating === "loved" && body.cuisine) {
    const prefs = await db.profile.findUnique({ where: { userId: user.id } });
    const cuisines = new Set(JSON.parse(prefs?.favoriteCuisinesJson || "[]") as string[]);
    cuisines.add(String(body.cuisine).toLowerCase());
    await updatePreferences(user.id, { favoriteCuisines: [...cuisines] });
  }
  if (body.rating === "nope" && body.ingredient) {
    const prefs = await db.profile.findUnique({ where: { userId: user.id } });
    const disliked = new Set(JSON.parse(prefs?.dislikedJson || "[]") as string[]);
    disliked.add(String(body.ingredient));
    await updatePreferences(user.id, { disliked: [...disliked] });
  }
  return json({ feedback });
}
