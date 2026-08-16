import { DoorDashProvider, UberEatsProvider } from "@/providers/shopping/marketplace";
import { GooglePlacesProvider } from "@/providers/shopping/google-places";
import { InstacartProvider } from "@/providers/shopping/instacart";
import { LocalSearchFallbackProvider } from "@/providers/shopping/local-search";
import type { ShoppingOffer, ShoppingRequest } from "@/providers/shopping/types";

const providers = [
  new InstacartProvider(),
  new DoorDashProvider(),
  new UberEatsProvider(),
  new GooglePlacesProvider(),
  new LocalSearchFallbackProvider(),
];

export function shoppingProviderStatus() {
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    available: provider.available(),
    capabilities: provider.capabilities(),
  }));
}

export async function findLocalShopping(request: ShoppingRequest): Promise<ShoppingOffer> {
  const usable = providers.filter((provider) => provider.available());
  const parts = await Promise.all(usable.map((provider) => provider.shop(request)));
  const stores = parts.flatMap((part) => part.stores ?? []);
  const delivery = parts.flatMap((part) => part.delivery ?? []).filter((option) => option.available || option.href);
  const uniqueStores = stores.filter((store, index) => stores.findIndex((item) => item.id === store.id) === index);
  return {
    stores: uniqueStores,
    delivery,
    disclaimer:
      "I won't pretend a store has an ingredient on the shelf unless a provider actually confirms it. 'Likely nearby' means the store type is a good bet — not a stock check.",
  };
}
