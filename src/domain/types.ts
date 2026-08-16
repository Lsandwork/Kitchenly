import { z } from "zod";

export const KitchenLocationSchema = z.enum([
  "fridge",
  "freezer",
  "pantry",
  "counter",
  "cabinet",
  "unknown",
]);
export type KitchenLocation = z.infer<typeof KitchenLocationSchema>;

export const MealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "any",
]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const RecipeStateSchema = z.enum([
  "make_now",
  "almost_there",
  "created_for_you",
]);
export type RecipeState = z.infer<typeof RecipeStateSchema>;

export const DietSchema = z.enum([
  "vegetarian",
  "vegan",
  "pescatarian",
  "gluten-free",
  "dairy-free",
  "low-carb",
  "high-protein",
  "nut-free",
]);
export type Diet = z.infer<typeof DietSchema>;

export const AllergenSchema = z.enum([
  "peanut",
  "tree-nut",
  "dairy",
  "egg",
  "gluten",
  "soy",
  "shellfish",
  "fish",
  "sesame",
]);
export type Allergen = z.infer<typeof AllergenSchema>;

export const EquipmentSchema = z.enum([
  "stovetop",
  "oven",
  "microwave",
  "air-fryer",
  "slow-cooker",
  "instant-pot",
  "blender",
  "grill",
  "toaster",
]);
export type Equipment = z.infer<typeof EquipmentSchema>;

export const CulinaryRoleSchema = z.enum([
  "protein",
  "fat",
  "acid",
  "salt",
  "sweet",
  "umami",
  "aromatic",
  "herb",
  "spice",
  "thickener",
  "emulsifier",
  "moisture",
  "starch",
  "vegetable",
  "dairy",
  "binder",
  "leavening",
]);
export type CulinaryRole = z.infer<typeof CulinaryRoleSchema>;

export type CanonicalIngredient = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  typicalLocation: KitchenLocation;
  perishabilityDays: number | null;
  staple: boolean;
  family: string;
  roles: CulinaryRole[];
  allergens: Allergen[];
  estimatedCost: "low" | "medium" | "high";
  versatility: number;
  bakingSensitive: boolean;
};

export type KitchenItemInput = {
  canonicalId: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  quantityNote?: string | null;
  location?: KitchenLocation;
  category?: string | null;
  brand?: string | null;
  packageSize?: string | null;
  freshness?: string | null;
  isStaple?: boolean;
  isLeftover?: boolean;
  isCooked?: boolean;
  isUsable?: boolean;
  useSoon?: boolean;
  confidence?: number;
  source?: string;
  confirmed?: boolean;
  estimatedExpiration?: Date | null;
  notes?: string | null;
};

export const IngredientDetectionSchema = z.object({
  name: z.string().min(1),
  canonicalIngredientId: z.string().optional(),
  quantity: z.number().optional().nullable().transform((v) => v ?? undefined),
  unit: z.string().optional().nullable().transform((v) => v ?? undefined),
  quantityNote: z.string().optional().nullable().transform((v) => v ?? undefined),
  location: KitchenLocationSchema.optional().catch("unknown"),
  category: z.string().optional().nullable().transform((v) => v ?? undefined),
  brand: z.string().optional().nullable().transform((v) => v ?? undefined),
  packageSize: z.string().optional().nullable().transform((v) => v ?? undefined),
  freshness: z.string().optional().nullable().transform((v) => v ?? undefined),
  confidence: z.coerce.number().min(0).max(1).catch(0.55),
  likelyUsable: z.boolean().optional().catch(true),
  isStaple: z.boolean().optional().catch(false),
  expirationVisible: z.string().optional().nullable().transform((v) => v ?? undefined),
  notes: z.string().optional().nullable().transform((v) => v ?? undefined),
});
export type IngredientDetection = z.infer<typeof IngredientDetectionSchema>;

export const VisionAnalysisSchema = z.object({
  locationGuess: KitchenLocationSchema.optional().catch("unknown"),
  items: z.array(IngredientDetectionSchema).default([]),
  overallConfidence: z.coerce.number().min(0).max(1).catch(0.5),
  commentary: z.string().default(""),
});
export type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;

export type RecipeIngredient = {
  name: string;
  canonicalId?: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
  importance: "critical" | "important" | "flexible" | "garnish";
  notes?: string;
};

export type RecipeStep = {
  order: number;
  instruction: string;
  timerSeconds?: number | null;
  tip?: string;
};

export type RecipeRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  origin: "owned" | "external" | "generated";
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  imageUrl?: string | null;
  servings: number;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  totalMinutes?: number | null;
  difficulty: "easy" | "medium" | "ambitious";
  cuisine?: string | null;
  mealType?: MealType | string | null;
  diets: Diet[];
  allergens: Allergen[];
  equipment: Equipment[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: string[];
  leftoverFriendly?: boolean;
};

export type IngredientMatch = {
  name: string;
  canonicalId?: string;
  status: "have" | "close" | "substitute" | "missing";
  kitchenName?: string;
  note?: string;
};

export type MissingIngredient = {
  name: string;
  canonicalId?: string;
  quantity?: number | null;
  unit?: string | null;
  importance: RecipeIngredient["importance"];
  estimatedCost: "low" | "medium" | "high";
  versatile: boolean;
};

export type SubstitutionSuggestion = {
  original: string;
  originalCanonicalId?: string;
  substitute: string;
  substituteCanonicalId?: string;
  explanation: string;
  flavorImpact: "none" | "subtle" | "noticeable";
  safeForBaking: boolean;
};

export type RankedRecipe = {
  type: "existing" | "generated";
  state: RecipeState;
  recipe: RecipeRecord;
  availableIngredients: IngredientMatch[];
  missingIngredients: MissingIngredient[];
  substitutions: SubstitutionSuggestion[];
  score: number;
  explanation: string;
  whyPicked: string;
  shoppingBurden: number;
};

export type UserPreferences = {
  skillLevel: "beginner" | "comfortable" | "advanced";
  typicalServings: number;
  preferredTimeMinutes: number;
  spiceLevel: "mild" | "medium" | "hot";
  diets: Diet[];
  allergies: Allergen[];
  disliked: string[];
  favoriteCuisines: string[];
  equipment: Equipment[];
  preferredStores: string[];
};

export type ConversationCard =
  | {
      kind: "recipe";
      recipe: RankedRecipe;
    }
  | {
      kind: "ingredients";
      items: { name: string; confidence: number; confirmed?: boolean }[];
    }
  | {
      kind: "shopping";
      items: { name: string; quantity?: number | null; unit?: string | null }[];
    }
  | {
      kind: "actions";
      actions: { id: string; label: string }[];
    };

export type AssistantTurn = {
  speech: string;
  cards: ConversationCard[];
  status?: string;
};

export const ChatIntentSchema = z.object({
  intent: z.enum([
    "recommend",
    "scan_prompt",
    "add_ingredients",
    "remove_ingredients",
    "leftovers",
    "modify_recipe",
    "substitute",
    "shop",
    "cook",
    "search",
    "feedback",
    "smalltalk",
    "preferences",
  ]),
  ingredients: z.array(z.string()).default([]),
  removeIngredients: z.array(z.string()).default([]),
  constraints: z
    .object({
      healthier: z.boolean().optional(),
      faster: z.boolean().optional(),
      maxMinutes: z.number().optional(),
      servings: z.number().optional(),
      noIngredient: z.array(z.string()).optional(),
      cuisine: z.string().optional(),
      spicy: z.boolean().optional(),
      kidFriendly: z.boolean().optional(),
      impressive: z.boolean().optional(),
      easiest: z.boolean().optional(),
      leftoverMode: z.boolean().optional(),
      equipment: z.string().optional(),
      mealType: z.string().optional(),
    })
    .default({}),
  speechHint: z.string().optional(),
});
export type ChatIntent = z.infer<typeof ChatIntentSchema>;
