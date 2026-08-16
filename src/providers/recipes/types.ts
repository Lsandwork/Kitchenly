import type { RecipeRecord } from "@/domain/types";

export interface RecipeSource {
  id: string;
  name: string;
  available(): boolean;
  search(query: {
    ingredients: string[];
    cuisine?: string;
    mealType?: string;
    text?: string;
  }): Promise<RecipeRecord[]>;
}
