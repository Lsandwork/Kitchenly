import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getKitchen, getPreferences, toKitchenInputs } from "@/services/kitchen";
import { recommendMeals, serializeRecipe } from "@/services/recommend";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const kitchen = toKitchenInputs(await getKitchen(user.id));
  const prefs = await getPreferences(user.id);
  try {
    const result = await recommendMeals(user.id, kitchen, prefs, body);
    return json({
      speech: result.speech,
      pick: result.pick ? serializeRecipe(result.pick) : null,
      alternatives: result.alternatives.map(serializeRecipe),
      all: result.all.map(serializeRecipe),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Let me try another angle on dinner.", 500);
  }
}
