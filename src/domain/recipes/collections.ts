export type CuratedCollection = {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  filter: {
    maxMinutes?: number;
    minMinutes?: number;
    tags?: string[];
    diets?: string[];
    mealType?: string;
    leftoverFriendly?: boolean;
    maxMissing?: number;
    noStoreTrip?: boolean;
    useSoon?: boolean;
  };
};

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    slug: "30-minute-meals",
    title: "30-Minute Meals",
    description: "Dinner that respects your evening.",
    seoTitle: "30-Minute Meals | Kitchen Friend",
    seoDescription: "Fast dinners you can actually cook on a weeknight, matched to what you already have.",
    filter: { maxMinutes: 30 },
  },
  {
    slug: "15-minute-meals",
    title: "15-Minute Meals",
    description: "When hunger won't wait.",
    seoTitle: "15-Minute Meals | Kitchen Friend",
    seoDescription: "Very fast recipes for busy nights, starting from your kitchen.",
    filter: { maxMinutes: 15 },
  },
  {
    slug: "no-store-trip",
    title: "No Store Trip",
    description: "Cook with what you already own.",
    seoTitle: "No Store Trip Recipes | Kitchen Friend",
    seoDescription: "Recipes you can make without leaving the house — based on your kitchen inventory.",
    filter: { noStoreTrip: true },
  },
  {
    slug: "high-protein",
    title: "High Protein",
    description: "Meals that pull their weight.",
    seoTitle: "High Protein Recipes | Kitchen Friend",
    seoDescription: "High-protein dinners and breakfasts matched to your kitchen.",
    filter: { diets: ["high-protein"] },
  },
  {
    slug: "healthy",
    title: "Something Healthier",
    description: "Lighter plates that still taste like dinner.",
    seoTitle: "Healthy Recipes | Kitchen Friend",
    seoDescription: "Vegetable-forward and lighter recipes personalized to your kitchen.",
    filter: { tags: ["healthy", "spinach", "vegetables"] },
  },
  {
    slug: "one-pan",
    title: "One-Pan",
    description: "Fewer dishes. Same dinner.",
    seoTitle: "One-Pan Recipes | Kitchen Friend",
    seoDescription: "One-pan and skillet dinners based on what you already have.",
    filter: { tags: ["one-pan", "skillet", "sheet-pan"] },
  },
  {
    slug: "five-ingredients",
    title: "Five Ingredients",
    description: "Simple lists. Real food.",
    seoTitle: "Five Ingredient Recipes | Kitchen Friend",
    seoDescription: "Short ingredient lists for nights when you want dinner without a project.",
    filter: { tags: ["five-ingredients"] },
  },
  {
    slug: "use-your-leftovers",
    title: "Use Your Leftovers",
    description: "Tonight's second act.",
    seoTitle: "Leftover Recipes | Kitchen Friend",
    seoDescription: "Recipes that turn leftovers into something you'll actually want to eat.",
    filter: { leftoverFriendly: true, tags: ["leftover"] },
  },
  {
    slug: "fridge-cleanout",
    title: "Fridge Cleanout",
    description: "Use what's hanging around.",
    seoTitle: "Fridge Cleanout Recipes | Kitchen Friend",
    seoDescription: "Recipes designed to clear the fridge without wasting good food.",
    filter: { leftoverFriendly: true },
  },
  {
    slug: "use-it-before-it-goes-bad",
    title: "Use It Before It Goes Bad",
    description: "Cook the urgent stuff first.",
    seoTitle: "Use Soon Recipes | Kitchen Friend",
    seoDescription: "Recipes that prioritize ingredients that should be used soon.",
    filter: { useSoon: true },
  },
  {
    slug: "easy-dinners",
    title: "Easy Dinners",
    description: "Comfortable difficulty. Real flavor.",
    seoTitle: "Easy Dinner Recipes | Kitchen Friend",
    seoDescription: "Easy weeknight dinners matched to your kitchen inventory.",
    filter: { mealType: "dinner", maxMinutes: 40 },
  },
  {
    slug: "kid-friendly",
    title: "Kid-Friendly",
    description: "Food the whole table will finish.",
    seoTitle: "Kid-Friendly Recipes | Kitchen Friend",
    seoDescription: "Approachable family dinners based on what you already have.",
    filter: { tags: ["quesadilla", "tacos", "eggs", "pasta"] },
  },
];

export function collectionBySlug(slug: string) {
  return CURATED_COLLECTIONS.find((item) => item.slug === slug) ?? null;
}
