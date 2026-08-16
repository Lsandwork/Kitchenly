import { getIngredient } from "@/domain/ingredients/catalog";
import { parseIngredientText } from "@/domain/ingredients/parse";
import { normalizeIngredientName } from "@/domain/ingredients/normalize";
import type { KitchenItemInput, KitchenLocation, UserPreferences } from "@/domain/types";
import { db } from "@/lib/db";
import { perishabilityUrgency } from "@/domain/matching/score";

export async function getKitchen(userId: string) {
  return db.kitchenItem.findMany({
    where: { userId, isUsable: true },
    orderBy: [{ useSoon: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const profile = await db.profile.findUnique({ where: { userId } });
  return {
    skillLevel: (profile?.skillLevel as UserPreferences["skillLevel"]) || "comfortable",
    typicalServings: profile?.typicalServings ?? 2,
    preferredTimeMinutes: profile?.preferredTimeMinutes ?? 30,
    spiceLevel: (profile?.spiceLevel as UserPreferences["spiceLevel"]) || "medium",
    diets: JSON.parse(profile?.dietsJson || "[]"),
    allergies: JSON.parse(profile?.allergiesJson || "[]"),
    disliked: JSON.parse(profile?.dislikedJson || "[]"),
    favoriteCuisines: JSON.parse(profile?.favoriteCuisinesJson || "[]"),
    equipment: JSON.parse(profile?.equipmentJson || '["stovetop","oven","microwave"]'),
    preferredStores: JSON.parse(profile?.preferredStoresJson || "[]"),
  };
}

export async function updatePreferences(userId: string, patch: Partial<UserPreferences> & { postalCode?: string; locationLabel?: string; lat?: number; lng?: number }) {
  const current = await getPreferences(userId);
  const merged: UserPreferences = { ...current, ...patch };
  return db.profile.upsert({
    where: { userId },
    update: {
      skillLevel: merged.skillLevel,
      typicalServings: merged.typicalServings,
      preferredTimeMinutes: merged.preferredTimeMinutes,
      spiceLevel: merged.spiceLevel,
      dietsJson: JSON.stringify(merged.diets),
      allergiesJson: JSON.stringify(merged.allergies),
      dislikedJson: JSON.stringify(merged.disliked),
      favoriteCuisinesJson: JSON.stringify(merged.favoriteCuisines),
      equipmentJson: JSON.stringify(merged.equipment),
      preferredStoresJson: JSON.stringify(merged.preferredStores),
      postalCode: patch.postalCode,
      locationLabel: patch.locationLabel,
      locationLat: patch.lat,
      locationLng: patch.lng,
    },
    create: { userId },
  });
}

function expirationFor(item: KitchenItemInput) {
  if (item.estimatedExpiration) return item.estimatedExpiration;
  const catalog = getIngredient(item.canonicalId);
  if (!catalog?.perishabilityDays) return null;
  const date = new Date();
  date.setDate(date.getDate() + catalog.perishabilityDays);
  return date;
}

export async function upsertKitchenItems(userId: string, items: KitchenItemInput[]) {
  const saved = [];
  for (const item of items) {
    const existing = await db.kitchenItem.findFirst({
      where: { userId, canonicalId: item.canonicalId },
    });
    const catalog = getIngredient(item.canonicalId);
    const data = {
      name: item.name,
      quantity: item.quantity ?? existing?.quantity ?? null,
      unit: item.unit ?? existing?.unit ?? null,
      quantityNote: item.quantityNote ?? existing?.quantityNote ?? null,
      location: item.location ?? existing?.location ?? catalog?.typicalLocation ?? "unknown",
      category: item.category ?? catalog?.category ?? null,
      brand: item.brand ?? existing?.brand ?? null,
      packageSize: item.packageSize ?? existing?.packageSize ?? null,
      freshness: item.freshness ?? existing?.freshness ?? null,
      isStaple: item.isStaple ?? catalog?.staple ?? false,
      isLeftover: item.isLeftover ?? existing?.isLeftover ?? false,
      isCooked: item.isCooked ?? existing?.isCooked ?? false,
      isUsable: item.isUsable ?? true,
      useSoon: item.useSoon ?? existing?.useSoon ?? false,
      confidence: item.confidence ?? existing?.confidence ?? 1,
      source: item.source ?? "manual",
      confirmed: item.confirmed ?? existing?.confirmed ?? false,
      estimatedExpiration: expirationFor(item) ?? existing?.estimatedExpiration ?? null,
      notes: item.notes ?? existing?.notes ?? null,
    };
    if (existing) {
      saved.push(await db.kitchenItem.update({ where: { id: existing.id }, data }));
    } else {
      saved.push(
        await db.kitchenItem.create({
          data: { userId, canonicalId: item.canonicalId, ...data },
        }),
      );
    }
  }
  return saved;
}

export async function addFromText(userId: string, text: string, location: KitchenLocation = "unknown") {
  return upsertKitchenItems(userId, parseIngredientText(text, location));
}

export async function removeIngredients(userId: string, names: string[]) {
  for (const name of names) {
    const normalized = normalizeIngredientName(name);
    const canonicalId = normalized.canonicalId ?? `raw:${name.toLowerCase()}`;
    await db.kitchenItem.deleteMany({ where: { userId, canonicalId } });
  }
}

export async function confirmItems(userId: string, ids: string[], confirmed: boolean) {
  await db.kitchenItem.updateMany({ where: { userId, id: { in: ids } }, data: { confirmed, confidence: confirmed ? 1 : 0.4 } });
}

export async function updateItem(userId: string, id: string, patch: Partial<KitchenItemInput> & { name?: string }) {
  const item = await db.kitchenItem.findFirst({ where: { id, userId } });
  if (!item) throw new Error("That ingredient isn't in your kitchen.");
  let canonicalId = item.canonicalId;
  let name = patch.name ?? item.name;
  if (patch.name && patch.name !== item.name) {
    const normalized = normalizeIngredientName(patch.name);
    canonicalId = normalized.canonicalId ?? item.canonicalId;
    name = normalized.displayName;
    await db.ingredientCorrection.create({
      data: { userId, fromName: item.name, toCanonical: canonicalId },
    });
  }
  return db.kitchenItem.update({
    where: { id },
    data: {
      canonicalId,
      name,
      quantity: patch.quantity ?? item.quantity,
      unit: patch.unit ?? item.unit,
      location: patch.location ?? item.location,
      isLeftover: patch.isLeftover ?? item.isLeftover,
      useSoon: patch.useSoon ?? item.useSoon,
      confirmed: true,
      confidence: 1,
    },
  });
}

export async function applyCorrection(userId: string, fromName: string, toName: string) {
  const normalized = normalizeIngredientName(toName);
  const from = normalizeIngredientName(fromName);
  await db.ingredientCorrection.create({
    data: { userId, fromName, toCanonical: normalized.canonicalId ?? toName },
  });
  if (from.canonicalId) {
    await db.kitchenItem.updateMany({
      where: { userId, canonicalId: from.canonicalId },
      data: {
        canonicalId: normalized.canonicalId ?? `raw:${toName.toLowerCase()}`,
        name: normalized.displayName,
        confirmed: true,
        confidence: 1,
      },
    });
  }
}

export async function clearKitchen(userId: string) {
  await db.kitchenItem.deleteMany({ where: { userId } });
}

export function toKitchenInputs(rows: Awaited<ReturnType<typeof getKitchen>>): KitchenItemInput[] {
  return rows.map((row) => ({
    canonicalId: row.canonicalId,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    quantityNote: row.quantityNote,
    location: row.location as KitchenLocation,
    category: row.category,
    brand: row.brand,
    isStaple: row.isStaple,
    isLeftover: row.isLeftover,
    isCooked: row.isCooked,
    isUsable: row.isUsable,
    useSoon: row.useSoon,
    confidence: row.confidence,
    source: row.source,
    confirmed: row.confirmed,
    estimatedExpiration: row.estimatedExpiration,
    notes: row.notes,
  }));
}

export function useFirst(rows: Awaited<ReturnType<typeof getKitchen>>) {
  const inputs = toKitchenInputs(rows);
  return [...inputs].sort((a, b) => perishabilityUrgency(b) - perishabilityUrgency(a))[0];
}
