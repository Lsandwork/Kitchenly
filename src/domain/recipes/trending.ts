/** Curated social-trending ranking for Kitchen Friend Recipes.
 * Scores reflect relative social momentum (TikTok / Instagram / Pinterest),
 * not fabricated external search-volume APIs.
 */
export type SocialTrend = {
  slug: string;
  score: number;
  reason: string;
  platforms: Array<"tiktok" | "instagram" | "pinterest" | "youtube">;
};

export const SOCIAL_TRENDING: SocialTrend[] = [
  {
    slug: "smash-burger-tacos",
    score: 100,
    reason: "The smash-taco craze still owns TikTok and Reels dinner feeds.",
    platforms: ["tiktok", "instagram"],
  },
  {
    slug: "dirty-cajun-spaghetti",
    score: 96,
    reason: "Creamy Cajun 'dirty spaghetti' is a top comfort-pasta share right now.",
    platforms: ["tiktok", "instagram"],
  },
  {
    slug: "gochujang-garlic-pasta",
    score: 93,
    reason: "Spicy-sweet gochujang pasta keeps circulating on weeknight Reels.",
    platforms: ["tiktok", "instagram", "pinterest"],
  },
  {
    slug: "crispy-rice-chicken-bowl",
    score: 90,
    reason: "Crispy rice bowls are a Pinterest + TikTok staple for texture-forward dinners.",
    platforms: ["tiktok", "pinterest"],
  },
  {
    slug: "high-protein-cottage-wraps",
    score: 88,
    reason: "High-protein cottage cheese wraps are still booming in fitness feeds.",
    platforms: ["tiktok", "instagram"],
  },
  {
    slug: "creamy-garlic-chicken",
    score: 84,
    reason: "Creamy skillet chicken stays evergreen across Instagram dinner carousels.",
    platforms: ["instagram", "pinterest"],
  },
  {
    slug: "weeknight-peanut-noodles",
    score: 80,
    reason: "Peanut noodles are a perennial viral weeknight save.",
    platforms: ["tiktok", "pinterest"],
  },
  {
    slug: "black-bean-tacos",
    score: 76,
    reason: "Fast vegetarian tacos keep showing up in budget dinner roundups.",
    platforms: ["pinterest", "instagram"],
  },
  {
    slug: "sheet-pan-chicken-and-vegetables",
    score: 72,
    reason: "Sheet-pan dinners dominate Pinterest 'easy dinner' boards.",
    platforms: ["pinterest"],
  },
  {
    slug: "chickpea-coconut-curry",
    score: 70,
    reason: "One-pan chickpea curry stays strong in plant-forward social feeds.",
    platforms: ["instagram", "pinterest"],
  },
  {
    slug: "garlic-spinach-pasta",
    score: 68,
    reason: "Garlic greens pasta is a classic shareable 20-minute dinner.",
    platforms: ["instagram", "pinterest"],
  },
  {
    slug: "crispy-garlic-chicken-quesadillas",
    score: 66,
    reason: "Cheesy skillet quesadillas keep winning weeknight Reels.",
    platforms: ["tiktok", "instagram"],
  },
  {
    slug: "lemon-garlic-chicken-skillet",
    score: 64,
    reason: "Bright lemon chicken remains a Pinterest favorite.",
    platforms: ["pinterest", "instagram"],
  },
  {
    slug: "yogurt-skillet-chicken",
    score: 62,
    reason: "Tangy yogurt chicken fits the high-protein social trend.",
    platforms: ["instagram", "tiktok"],
  },
  {
    slug: "leftover-fried-rice",
    score: 60,
    reason: "Leftover fried rice hacks stay endlessly shareable.",
    platforms: ["tiktok"],
  },
  {
    slug: "savory-tomato-eggs",
    score: 58,
    reason: "Tomato eggs keep resurfacing in quick-breakfast content.",
    platforms: ["tiktok", "instagram"],
  },
  {
    slug: "cheesy-egg-breakfast-tacos",
    score: 56,
    reason: "Breakfast tacos are a reliable morning social staple.",
    platforms: ["instagram", "tiktok"],
  },
  {
    slug: "eggs-in-tomato-sauce",
    score: 54,
    reason: "Shakshuka-style eggs stay on brunch boards year-round.",
    platforms: ["pinterest", "instagram"],
  },
  {
    slug: "garlicky-mushroom-toast",
    score: 52,
    reason: "Mushroom toast is a quiet Pinterest powerhouse.",
    platforms: ["pinterest"],
  },
  {
    slug: "garlic-chili-pantry-pasta",
    score: 50,
    reason: "Pantry chili oil pasta is a late-night viral classic.",
    platforms: ["tiktok"],
  },
  {
    slug: "spinach-cheddar-frittata",
    score: 48,
    reason: "Frittatas keep showing up in meal-prep carousels.",
    platforms: ["pinterest", "instagram"],
  },
  {
    slug: "crispy-garlic-chicken-wraps",
    score: 46,
    reason: "Crispy chicken wraps stay strong in packed-lunch content.",
    platforms: ["instagram"],
  },
];

export function socialTrendFor(slug: string) {
  return SOCIAL_TRENDING.find((item) => item.slug === slug) ?? null;
}

export function socialScoreFor(slug: string) {
  return socialTrendFor(slug)?.score ?? 0;
}
