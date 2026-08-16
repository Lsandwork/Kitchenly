export type LandingRecipe = {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  totalMinutes: number;
  difficulty: string;
};

export type LandingUserState = {
  guest: boolean;
  name: string | null;
  loaded: boolean;
};
