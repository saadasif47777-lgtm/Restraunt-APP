import type { Dish, Workspace } from "./types";
const rows: [string, string, string, string, number, string][] = [
  [
    "Chicken Karahi",
    "karahi",
    "Mains",
    "Tomato gravy, green chilli & fresh ginger",
    950,
    "Curry",
  ],
  [
    "Chicken Tikka",
    "tikka",
    "Grill",
    "Charcoal-grilled chicken with house spices",
    650,
    "Grill",
  ],
  [
    "Chicken Biryani",
    "biryani",
    "Rice",
    "Fragrant basmati, saffron & spiced chicken",
    750,
    "Rice",
  ],
  [
    "Garlic Naan",
    "naan",
    "Breads",
    "Tandoor-baked flatbread with garlic butter",
    180,
    "Tandoor",
  ],
  [
    "Seekh Kebab",
    "kebab",
    "Grill",
    "Hand-formed kebabs with coriander",
    690,
    "Grill",
  ],
  [
    "Mango Lassi",
    "lassi",
    "Drinks",
    "Chilled mango, yogurt & cardamom",
    340,
    "Drinks",
  ],
];
const dishes: Dish[] = rows.map(
  ([name, img, category, description, price, station], i) =>
    ({
      id: String(i + 1),
      name,
      photo: "/food/" + img + ".jpg",
      description,
      category,
      station,
      available: i !== 3,
      archived: false,
      spice: i < 3 ? "Medium" : "",
      allergens: i === 3 ? ["Wheat", "Milk"] : [],
      portions:
        i === 0
          ? [
              { name: "Half", price },
              { name: "Full", price: 1700 },
            ]
          : [{ name: "Regular", price }],
      modifiers:
        i === 0 ? { Extras: [{ name: "Extra ginger", price: 50 }] } : {},
    }) as Dish,
);
export const sample: Workspace = {
  name: "Gulberg Branch",
  hours: "12 pm – 11 pm",
  currency: "PKR",
  stations: ["Curry", "Grill", "Rice", "Tandoor", "Drinks"],
  revision: 1,
  live: false,
  role: "owner",
  tables: [{ id: "preview", label: "Table 5" }],
  staff: [{ email: "Ayesha Khan", role: "owner" }],
  draft: { categories: ["Mains", "Grill", "Rice", "Breads", "Drinks"], dishes },
};
