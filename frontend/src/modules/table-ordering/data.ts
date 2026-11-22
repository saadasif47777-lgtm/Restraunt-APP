export interface MenuChoice {
  name: string;
  portions: { name: string; price: number }[];
  extra?: { name: string; price: number };
}
export interface CartLine {
  id: number;
  dish: number;
  portion: number;
  extra: boolean;
  quantity: number;
  note: string;
}
export const menu: MenuChoice[] = [
  {
    name: "Chicken Karahi",
    portions: [
      { name: "Half", price: 950 },
      { name: "Full", price: 1700 },
    ],
    extra: { name: "Extra ginger", price: 50 },
  },
  { name: "Garlic Naan", portions: [{ name: "Regular", price: 180 }] },
  { name: "Mango Lassi", portions: [{ name: "Glass", price: 340 }] },
];
export function amount(line: CartLine) {
  const d = menu[line.dish];
  return (
    line.quantity *
    (d.portions[line.portion].price + (line.extra ? d.extra?.price || 0 : 0))
  );
}
