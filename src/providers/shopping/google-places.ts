import { ingredientStoreHint } from "@/domain/shopping/lists";
import { env, hasValue } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { LocalShoppingProvider, NearbyStore, ShoppingOffer, ShoppingRequest } from "@/providers/shopping/types";

const TYPE_MAP: Record<string, string> = {
  grocery_store: "grocery_store",
  supermarket: "supermarket",
  market: "market",
  asian_grocery_store: "asian_grocery_store",
  hispanic_grocery: "grocery_store",
};

export class GooglePlacesProvider implements LocalShoppingProvider {
  id = "google-places";
  name = "Nearby stores";
  kind = "stores" as const;

  available() {
    return hasValue(env().GOOGLE_MAPS_API_KEY);
  }

  capabilities() {
    return this.available() ? ["nearby_search", "text_search"] : [];
  }

  async shop(request: ShoppingRequest): Promise<Partial<ShoppingOffer>> {
    if (!this.available() || request.lat == null || request.lng == null) return { stores: [] };
    const hints = ingredientStoreHint(request.items[0]?.name ?? "grocery");
    const includedTypes = [...new Set(hints.map((hint) => TYPE_MAP[hint] || "grocery_store"))];
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env().GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri,places.currentOpeningHours,places.regularOpeningHours",
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: 8,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude: request.lat, longitude: request.lng },
              radius: 8000,
            },
          },
        }),
      });
      if (!response.ok) {
        logger.warn("places.nearby_failed", { status: response.status });
        return { stores: [] };
      }
      const json = (await response.json()) as {
        places?: {
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
          types?: string[];
          googleMapsUri?: string;
          currentOpeningHours?: { weekdayDescriptions?: string[] };
        }[];
      };
      const stores: NearbyStore[] = (json.places ?? []).map((place) => ({
        id: place.id ?? place.displayName?.text ?? "store",
        name: place.displayName?.text ?? "Grocery store",
        address: place.formattedAddress,
        distanceMiles: distanceMiles(request.lat!, request.lng!, place.location?.latitude, place.location?.longitude),
        mapsUrl:
          place.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text ?? "grocery")}`,
        availability: "likely",
        availabilityNote: "Likely nearby — I can't verify shelf inventory.",
        types: place.types,
        openUntil: place.currentOpeningHours?.weekdayDescriptions?.[0],
      }));
      return { stores };
    } catch (error) {
      logger.warn("places.error", { error: String(error) });
      return { stores: [] };
    }
  }
}

function distanceMiles(lat1: number, lng1: number, lat2?: number, lng2?: number) {
  if (lat2 == null || lng2 == null) return undefined;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}
