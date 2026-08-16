import { allIngredients } from "@/domain/ingredients/catalog";
import { json } from "@/lib/http";

export async function GET() {
  return json({
    ingredients: allIngredients().map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      aliases: item.aliases,
    })),
  });
}
