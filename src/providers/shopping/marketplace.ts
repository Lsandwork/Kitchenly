import { env, hasValue } from "@/lib/env";
import type { LocalShoppingProvider, ShoppingOffer } from "@/providers/shopping/types";

export class DoorDashProvider implements LocalShoppingProvider {
  id = "doordash";
  name = "DoorDash";
  kind = "delivery" as const;

  available() {
    return hasValue(env().DOORDASH_API_KEY) || hasValue(env().DOORDASH_CLIENT_ID);
  }

  capabilities() {
    return this.available() ? ["marketplace"] : [];
  }

  async shop(): Promise<Partial<ShoppingOffer>> {
    if (!this.available()) {
      return { delivery: [] };
    }
    return {
      delivery: [
        {
          provider: this.id,
          label: "DoorDash",
          available: false,
          cta: "Search locally",
          href: "https://www.doordash.com/",
          note: "DoorDash Marketplace access is approval-based. Credentials are present, but this app will not pretend live grocery inventory exists without a successful API response.",
        },
      ],
    };
  }
}

export class UberEatsProvider implements LocalShoppingProvider {
  id = "uber-eats";
  name = "Uber Eats";
  kind = "delivery" as const;

  available() {
    return hasValue(env().UBER_CLIENT_ID);
  }

  capabilities() {
    return this.available() ? ["marketplace"] : [];
  }

  async shop(): Promise<Partial<ShoppingOffer>> {
    if (!this.available()) return { delivery: [] };
    return {
      delivery: [
        {
          provider: this.id,
          label: "Uber Eats",
          available: false,
          cta: "Search locally",
          href: "https://www.ubereats.com/",
          note: "Uber Eats Marketplace APIs require partner approval. Live carts are not enabled until that access is granted.",
        },
      ],
    };
  }
}
