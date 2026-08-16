import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { findLocalShopping } from "@/providers/shopping";
import { shoppingFromRecipes } from "@/domain/shopping/lists";
import type { RankedRecipe } from "@/domain/types";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();
  const items = (body.items ?? []) as { name: string; quantity?: number | null; unit?: string | null }[];
  const recipes = (body.recipes ?? []) as RankedRecipe[];
  const listItems = items.length ? items : shoppingFromRecipes(recipes);

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  const offer = await findLocalShopping({
    items: listItems,
    recipeTitle: body.recipeTitle,
    lat: body.lat ?? profile?.locationLat,
    lng: body.lng ?? profile?.locationLng,
    postalCode: body.postalCode ?? profile?.postalCode,
  });

  const list = await db.shoppingList.create({
    data: {
      userId: user.id,
      title: body.recipeTitle ? `For ${body.recipeTitle}` : "Missing ingredients",
      items: {
        create: listItems.map((item) => ({
          name: item.name,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          canonicalId: "canonicalId" in item ? (item as { canonicalId?: string }).canonicalId : null,
        })),
      },
    },
    include: { items: true },
  });

  return json({ list, offer });
}

export async function GET() {
  const user = await requireUser();
  const lists = await db.shoppingList.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return json({ lists });
}
