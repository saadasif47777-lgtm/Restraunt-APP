export type TableAction =
  | "Incoming order"
  | "Sent to kitchen"
  | "Ready to serve"
  | "Served"
  | "Water request"
  | "Napkins request"
  | "Help request"
  | "Bill request"
  | "Acknowledged";
export type FloorTable = {
  number: number;
  item: string;
  action: TableAction;
  minutes: number;
};
export const sampleTables: FloorTable[] = [
  {
    number: 5,
    item: "Chicken Karahi · Half, extra ginger",
    action: "Incoming order",
    minutes: 4,
  },
  { number: 6, item: "Chicken Tikka", action: "Ready to serve", minutes: 2 },
  ...(
    [
      "Water request",
      "Napkins request",
      "Help request",
      "Bill request",
    ] as const
  ).map((action, i) => ({ number: 7 + i, item: "", action, minutes: i + 1 })),
];
