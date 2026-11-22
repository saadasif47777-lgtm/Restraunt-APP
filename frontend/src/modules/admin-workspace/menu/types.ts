export type Portion = { name: string; price: number | null };
export type Dish = {
  id: string;
  name: string;
  category: string;
  description: string;
  photo: string;
  station: string;
  portions: Portion[];
  modifiers: Record<string, Portion[]>;
  spice: string;
  deal?: string;
  allergens: string[];
  import_rows?: string[];
  available: boolean;
  archived: boolean;
};
export type Draft = { categories: string[]; dishes: Dish[] };
export type Workspace = {
  name: string;
  hours: string;
  currency: string;
  stations: string[];
  revision: number;
  live: boolean;
  public_menu_base_url: string;
  tables: { id: string; label: string }[];
  draft: Draft;
};
export const blank = (category: string): Dish => ({
  id: crypto.randomUUID(),
  name: "",
  category,
  description: "",
  photo: "",
  station: "",
  portions: [{ name: "Regular", price: null }],
  modifiers: {},
  spice: "",
  allergens: [],
  available: true,
  archived: false,
});
