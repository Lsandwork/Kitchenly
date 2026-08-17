import { appUrl, env, hasValue } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { LocalShoppingProvider, ShoppingOffer, ShoppingRequest } from "@/providers/shopping/types";

export class InstacartProvider implements LocalShoppingProvider {
  id = "instacart";
  name = "Instacart";
  kind = "delivery" as const;

  available() {
    return hasValue(env().INSTACART_API_KEY);
  }

  capabilities() {
    return this.available() ? ["shopping_list", "recipe_page", "nearby_retailers"] : [];
  }

  async shop(request: ShoppingRequest): Promise<Partial<ShoppingOffer>> {
    if (!this.available()) {
      return {
        delivery: [
          {
            provider: this.id,
            label: "Instacart",
            available: false,
            cta: "Not configured",
            note: "Add INSTACART_API_KEY to enable missing-ingredient shopping lists.",
          },
        ],
      };
    }
    const base = env().INSTACART_API_BASE || "https://connect.instacart.com";
    try {
      const response = await fetch(`${base}/idp/v1/products/products_link`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${env().INSTACART_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: request.recipeTitle ? `Missing for ${request.recipeTitle}` : "Dishly list",
          link_type: "shopping_list",
          expires_in: 14,
          line_items: request.items.map((item) => ({
            name: item.name,
            display_text: item.name,
            line_item_measurements: item.quantity
              ? [{ quantity: item.quantity, unit: item.unit || "each" }]
              : [{ quantity: 1, unit: "each" }],
          })),
          landing_page_configuration: {
            partner_linkback_url: request.partnerLinkbackUrl || `${appUrl()}/shop`,
          },
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        logger.warn("instacart.link_failed", { status: response.status, body: body.slice(0, 300) });
        return {
          delivery: [
            {
              provider: this.id,
              label: "Instacart",
              available: false,
              cta: "Instacart unavailable",
              note: "Instacart didn't return a shopping link. Try nearby stores instead.",
            },
          ],
        };
      }
      const json = (await response.json()) as { products_link_url?: string };
      return {
        delivery: [
          {
            provider: this.id,
            label: "Instacart",
            available: true,
            cta: "Shop these ingredients",
            href: json.products_link_url,
            note: "Opens an Instacart list with only the missing ingredients.",
          },
        ],
      };
    } catch (error) {
      logger.error("instacart.error", { error: String(error) });
      return {
        delivery: [
          {
            provider: this.id,
            label: "Instacart",
            available: false,
            cta: "Instacart unavailable",
            note: "Could not reach Instacart. Nearby store search still works.",
          },
        ],
      };
    }
  }
}
