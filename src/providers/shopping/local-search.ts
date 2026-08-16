import { ingredientStoreHint } from "@/domain/shopping/lists";
import type { LocalShoppingProvider, NearbyStore, ShoppingOffer, ShoppingRequest } from "@/providers/shopping/types";

export class LocalSearchFallbackProvider implements LocalShoppingProvider {
  id = "local-search";
  name = "Google Maps";
  kind = "search" as const;

  available() {
    return true;
  }

  capabilities() {
    return ["maps_search"];
  }

  async shop(request: ShoppingRequest): Promise<Partial<ShoppingOffer>> {
    const query = request.items.map((item) => item.name).slice(0, 4).join(" ");
    const hints = ingredientStoreHint(request.items[0]?.name ?? "grocery");
    const near = request.postalCode ? ` near ${request.postalCode}` : "";
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${hints[0].replace(/_/g, " ")} ${query}${near}`)}`;
    const stores: NearbyStore[] = [
      {
        id: "maps-fallback",
        name: "Search nearby stores",
        mapsUrl,
        availability: "unknown",
        availabilityNote: "I found nearby stores that are likely to carry this, but I can't verify their shelf inventory.",
      },
    ];
    return {
      stores,
      delivery: [
        {
          provider: "maps",
          label: "Google Maps",
          available: true,
          cta: "View nearby stores",
          href: mapsUrl,
          note: "Opens a local search for the missing ingredients.",
        },
      ],
    };
  }
}
