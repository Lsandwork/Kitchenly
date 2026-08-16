import { describe, expect, it } from "vitest";
import { shoppingProviderStatus } from "@/providers/shopping";
import { availableRecipeSources } from "@/providers/recipes";
import { aiStatus } from "@/providers/ai";

describe("provider fallbacks", () => {
  it("does not claim grocery APIs are live without credentials", () => {
    const shopping = shoppingProviderStatus();
    const instacart = shopping.find((provider) => provider.id === "instacart");
    const doordash = shopping.find((provider) => provider.id === "doordash");
    const uber = shopping.find((provider) => provider.id === "uber-eats");
    const maps = shopping.find((provider) => provider.id === "local-search");
    expect(instacart?.available).toBe(false);
    expect(doordash?.available).toBe(false);
    expect(uber?.available).toBe(false);
    expect(maps?.available).toBe(true);
  });

  it("always has an owned recipe source", () => {
    expect(availableRecipeSources().some((source) => source.id === "owned")).toBe(true);
  });

  it("reports AI as unavailable when no keys are set", () => {
    expect(aiStatus().available).toBe(false);
  });
});
