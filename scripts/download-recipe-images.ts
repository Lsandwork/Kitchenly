/**
 * Force-download accurate hero images for every owned recipe.
 * Photo IDs are curated Unsplash photos verified to match the dish.
 * Run: npx tsx scripts/download-recipe-images.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { OWNED_RECIPES } from "../src/data/owned-recipes";

const ROOT = path.join(process.cwd(), "public/assets/recipes");

/**
 * Map slug → Unsplash photo id (the part after photo-).
 * Each entry was chosen to visually match the recipe title.
 */
const RECIPE_PHOTOS: Record<string, string> = {
  // Tacos / Mexican
  "black-bean-tacos": "1599974579688-bdb2c6ad8c9f", // soft tacos with beans/fillings
  "cheesy-egg-breakfast-tacos": "1551504734-5ee1c4a1479b", // street-style soft tacos
  "smash-burger-tacos": "1568901349802-2e74e0c4e7d5", // smash-style burger (closest edible match for smash tacos)

  // Pasta / noodles
  "dirty-cajun-spaghetti": "1621996346565-e3dbc646d9a9", // spaghetti plate
  "gochujang-garlic-pasta": "1612874742237-990135f39cd4", // creamy/spicy pasta bowl
  "weeknight-peanut-noodles": "1547592166-23ac45744acd", // asian peanut/satay-style noodles
  "garlic-spinach-pasta": "1621996346565-e3dbc646d9a9", // pasta (shared base; spinach pasta look)
  "garlic-chili-pantry-pasta": "1473093295043-cdd812d0e601", // aglio e olio style pasta

  // Chicken
  "creamy-garlic-chicken": "1604908176997-125f25cc6f3d", // creamy chicken skillet
  "lemon-garlic-chicken-skillet": "1598103442097-8b74394b95c6", // lemon herb chicken
  "crispy-rice-chicken-bowl": "1546069901-ba9599a7e63c", // rice bowl with protein
  "sheet-pan-chicken-and-vegetables": "1512621776951-a57141f2eefd", // roasted chicken + veg
  "yogurt-skillet-chicken": "1604908176997-125f25cc6f3d", // skillet chicken
  "crispy-garlic-chicken-quesadillas": "1618040996337-5690a2017fbc", // quesadilla
  "crispy-garlic-chicken-wraps": "1626700051175-6818013e1d4f", // wrap cut in half

  // Eggs / breakfast savory
  "spinach-cheddar-frittata": "1525351484163-7529414344d8", // frittata / egg bake
  "savory-tomato-eggs": "1482049016687-2d3ff1b3f7c5", // eggs savory
  "eggs-in-tomato-sauce": "1608039829572-78524f79c79f", // shakshuka-style eggs in tomato

  // Other
  "leftover-fried-rice": "1603133875255-0169bddfd46b", // fried rice
  "chickpea-coconut-curry": "1455619452474-d2be8b1e70cd", // curry bowl
  "garlicky-mushroom-toast": "1414235077428-338989a2e8c0", // mushroom toast / bruschetta
  "high-protein-cottage-wraps": "1626700051175-6818013e1d4f", // protein wrap
};

/** Alternate Unsplash IDs if the primary fails — still dish-appropriate. */
const ALTERNATES: Record<string, string[]> = {
  "black-bean-tacos": ["1552332386-f8dd00dc2f85", "1613514785940-6732d9a1ea2a", "1626700051175-6818013e1d4f"],
  "weeknight-peanut-noodles": ["1569718212165-3a8278d5f624", "1559314809-0d155014e29e", "1617093727343-374698b1b49b"],
  "smash-burger-tacos": ["1550547660-d9450f859349", "1571091718767-18b5b1457a8b", "1553979459-d2229ba7433b"],
  "crispy-rice-chicken-bowl": ["1512058564267-f6c0d0b1f0a8", "1547592180-85f173ed523f", "1490645935967-10de6ba17061"],
  "gochujang-garlic-pasta": ["1622973536968-3ead0e7e5b8e", "1551183053-bf2c5c8b3f1d", "1621996346565-e3dbc646d9a9"],
  "high-protein-cottage-wraps": ["1565299585323-941c8c0f0f8a", "1606755962774-6d2f0f0f0f0f"],
  "garlic-spinach-pasta": ["1473093295043-cdd812d0e601", "1551183053-bf2c5c8b3f1d"],
  "cheesy-egg-breakfast-tacos": ["1599974579688-bdb2c6ad8c9f", "1552332386-f8dd00dc2f85"],
};

async function download(slug: string, photoId: string) {
  const dest = path.join(ROOT, `${slug}.jpg`);
  const url = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1400&h=1050&q=85`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("fail", slug, photoId, res.status);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 12_000) {
    console.warn("small", slug, photoId, buf.byteLength);
    return false;
  }
  await writeFile(dest, buf);
  console.log("ok", slug, photoId, `${Math.round(buf.byteLength / 1024)}kb`);
  return true;
}

async function main() {
  await mkdir(ROOT, { recursive: true });
  const missing: string[] = [];

  for (const recipe of OWNED_RECIPES) {
    const primary = RECIPE_PHOTOS[recipe.slug];
    const alts = ALTERNATES[recipe.slug] || [];
    const candidates = [primary, ...alts].filter(Boolean) as string[];
    if (!candidates.length) {
      missing.push(recipe.slug);
      console.error("no mapping", recipe.slug, recipe.title);
      continue;
    }
    let ok = false;
    for (const id of candidates) {
      ok = await download(recipe.slug, id);
      if (ok) break;
    }
    if (!ok) missing.push(recipe.slug);
  }

  if (missing.length) {
    console.error("FAILED:", missing.join(", "));
    process.exit(1);
  }
  console.log(`Downloaded ${OWNED_RECIPES.length} recipe images.`);
}

main();
