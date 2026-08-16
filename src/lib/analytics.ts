import { logger } from "@/lib/logger";

export type RecipeAnalyticsEvent =
  | "recipe_view"
  | "recipe_search"
  | "recipe_save"
  | "recipe_share"
  | "recipe_email"
  | "recipe_start_cooking"
  | "recipe_complete"
  | "recipe_make_with_mine"
  | "recipe_substitution"
  | "recipe_healthier"
  | "recipe_cheaper"
  | "recipe_faster"
  | "recipe_match_check"
  | "shopping_list_generate"
  | "shopping_list_email"
  | "meal_plan_add"
  | "weekly_plan_generate"
  | "weekly_plan_email"
  | "inventory_updated_from_recipe"
  | "landing_view"
  | "hero_signup_click"
  | "hero_demo_click"
  | "ingredient_selected"
  | "ingredient_recipe_search"
  | "recipe_preview_click"
  | "scan_cta_click"
  | "signup_cta_click"
  | "login_click"
  | "final_signup_click"
  | "open_kitchen_click"
  | "how_it_works_click"
  | "shop_cta_click"
  | "tonight_cta_click";

export function track(event: RecipeAnalyticsEvent, props?: Record<string, string | number | boolean | null | undefined>) {
  logger.info("analytics", { event, ...props });
}
