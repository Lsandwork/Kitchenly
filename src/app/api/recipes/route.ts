import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { discoverySections, matchKitchenRecipes } from "@/services/recipes";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "discovery";
  const query = url.searchParams.get("q") || undefined;
  const maxMinutes = url.searchParams.get("maxMinutes");
  const diet = url.searchParams.get("diet") || undefined;

  if (mode === "search" || query) {
    const result = await matchKitchenRecipes(user.id, {
      query,
      maxMinutes: maxMinutes ? Number(maxMinutes) : undefined,
      diet,
    });
    return json({
      cards: result.cards,
      kitchenCount: result.kitchen.length,
    });
  }

  const sections = await discoverySections(user.id);
  return json(sections);
}

const SearchBody = z.object({
  query: z.string().optional(),
  maxMinutes: z.number().optional(),
  diet: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const body = SearchBody.parse(await request.json());
    const result = await matchKitchenRecipes(user.id, body);
    return json({ cards: result.cards, kitchenCount: result.kitchen.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Search failed", 400);
  }
}
