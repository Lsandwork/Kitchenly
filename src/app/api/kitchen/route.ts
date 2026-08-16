import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import {
  addFromText,
  clearKitchen,
  confirmItems,
  getKitchen,
  removeIngredients,
  updateItem,
} from "@/services/kitchen";

export async function GET() {
  const user = await requireUser();
  const kitchen = await getKitchen(user.id);
  return json({ kitchen });
}

const PatchSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  location: z.enum(["fridge", "freezer", "pantry", "counter", "cabinet", "unknown"]).optional(),
  useSoon: z.boolean().optional(),
  isLeftover: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();
  if (body.text) {
    const items = await addFromText(user.id, body.text, body.location);
    return json({ kitchen: items });
  }
  if (body.confirmIds) {
    await confirmItems(user.id, body.confirmIds, true);
    return json({ ok: true });
  }
  return fail("Tell me what you've got.");
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  const body = PatchSchema.parse(await request.json());
  const item = await updateItem(user.id, body.id, body);
  return json({ item });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();
  if (body.clear) {
    await clearKitchen(user.id);
    return json({ ok: true });
  }
  await removeIngredients(user.id, body.names ?? []);
  if (body.id) {
    const { db } = await import("@/lib/db");
    await db.kitchenItem.deleteMany({ where: { id: body.id, userId: user.id } });
  }
  return json({ ok: true });
}
