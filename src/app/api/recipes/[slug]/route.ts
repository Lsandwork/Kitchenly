import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { track } from "@/lib/analytics";
import { getRecipeDetail } from "@/services/recipes";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser();
  const { slug } = await params;
  const url = new URL(request.url);
  const servings = url.searchParams.get("servings");
  const detail = await getRecipeDetail(user.id, slug, servings ? Number(servings) : undefined);
  if (!detail) return fail("Recipe not found", 404);
  track("recipe_view", { slug, userId: user.id });
  return json({
    recipe: detail.recipe,
    match: detail.match,
    kitchenMatchPercent: detail.kitchenMatchPercent,
    why: detail.why,
    saved: detail.saved,
    note: detail.note,
    userRating: detail.userRating,
    substitutions: detail.substitutions,
    shopping: detail.shopping,
    ratingAverage: detail.row.ratingAverage,
    ratingCount: detail.row.ratingCount,
    seoTitle: detail.row.seoTitle,
    seoDescription: detail.row.seoDescription,
    leftoverInstructions: detail.row.leftoverInstructions,
    storageInstructions: detail.row.storageInstructions,
    userEmail: user.email,
  });
}
