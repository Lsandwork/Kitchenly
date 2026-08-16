export type StoreAvailability = "confirmed" | "likely" | "unknown";

export type NearbyStore = {
  id: string;
  name: string;
  distanceMiles?: number;
  address?: string;
  openUntil?: string;
  mapsUrl: string;
  availability: StoreAvailability;
  availabilityNote: string;
  types?: string[];
};

export type DeliveryOption = {
  provider: string;
  label: string;
  available: boolean;
  cta: string;
  href?: string;
  note: string;
};

export type ShoppingOffer = {
  stores: NearbyStore[];
  delivery: DeliveryOption[];
  disclaimer: string;
};

export type ShoppingRequest = {
  items: { name: string; quantity?: number | null; unit?: string | null }[];
  recipeTitle?: string;
  lat?: number | null;
  lng?: number | null;
  postalCode?: string | null;
  partnerLinkbackUrl?: string;
};

export interface LocalShoppingProvider {
  id: string;
  name: string;
  kind: "delivery" | "stores" | "search";
  available(): boolean;
  capabilities(): string[];
  shop(request: ShoppingRequest): Promise<Partial<ShoppingOffer>>;
}
