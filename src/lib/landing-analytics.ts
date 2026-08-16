import { track as baseTrack } from "@/lib/analytics";

export type LandingAnalyticsEvent =
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

export function trackLanding(
  event: LandingAnalyticsEvent,
  props?: Record<string, string | number | boolean | null | undefined>,
) {
  baseTrack(event as never, props);
}
