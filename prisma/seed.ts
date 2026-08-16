import { OWNED_RECIPES } from "../src/data/owned-recipes";
import { recipeToSeedData } from "../src/services/recipes/mapper";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const db = new PrismaClient();
const ADMIN_EMAIL = "lsand.work@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Ls8833559!!@";

async function seedRecipes() {
  for (const recipe of OWNED_RECIPES) {
    const data = recipeToSeedData(recipe);
    await db.recipe.upsert({
      where: { slug: recipe.slug },
      update: {
        ...data,
        imageUrl: data.imageUrl,
      },
      create: {
        id: recipe.id,
        slug: recipe.slug,
        ...data,
      },
    });
  }
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: "admin",
        name: existing.name || "Lonnie",
        deletedAt: null,
      },
    });
    console.log("Updated admin", ADMIN_EMAIL);
    return;
  }
  await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Lonnie",
      role: "admin",
      guestToken: nanoid(),
      profile: { create: {} },
    },
  });
  console.log("Created admin", ADMIN_EMAIL);
}

async function clearDemoKitchens() {
  // Remove leftover demo inventory so empty kitchens stay empty.
  const deleted = await db.kitchenItem.deleteMany({});
  console.log("Cleared kitchen items:", deleted.count);
}

async function main() {
  await seedRecipes();
  await clearDemoKitchens();
  await seedAdmin();
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
