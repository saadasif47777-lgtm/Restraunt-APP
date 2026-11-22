export interface Ticket {
  table: number;
  station: string;
  dish: string;
  note: string;
  elapsed: number;
}
export const tickets: Ticket[] = [
  {
    table: 5,
    station: "Curry",
    dish: "Chicken Karahi",
    note: "Less chilli · Extra ginger",
    elapsed: 360,
  },
  {
    table: 6,
    station: "Grill",
    dish: "Chicken Tikka",
    note: "No chilli garnish",
    elapsed: 150,
  },
];
