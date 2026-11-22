"use client";
import { useState } from "react";
import Frame from "../PreviewWorkspace";
import { data } from "./data";
export default function WaiterFloorScreen() {
  const [table, select] = useState(5),
    [st, set] = useState<Record<number, string>>({
      5: "Incoming order",
      6: "Ready to serve",
      7: "Water request",
    }),
    [item, change] = useState(data.item);
  return (
    <Frame title="Waiter floor">
      <section>
        <div className="chips">
          {[5, 6, 7].map((n) => (
            <button
              className={table === n ? "active" : ""}
              key={n}
              onClick={() => select(n)}
            >
              Table {n}
            </button>
          ))}
        </div>
        <h2>Table {table}</h2>
        <small>4 min elapsed</small>
        <h3>{st[table]}</h3>
        <p>{item}</p>
        <button
          onClick={() =>
            set({
              ...st,
              [table]:
                st[table] === "Incoming order"
                  ? "Sent to kitchen"
                  : st[table] === "Ready to serve"
                    ? "Served"
                    : "Acknowledged",
            })
          }
        >
          {" "}
          {st[table] === "Incoming order"
            ? "Approve and send"
            : st[table] === "Ready to serve"
              ? "Mark served"
              : "Acknowledge"}
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set({ ...st, [table]: "Incoming order" });
          }}
        >
          <label>
            Waiter-entered dish
            <input
              required
              value={item}
              onChange={(e) => change(e.target.value)}
            />
          </label>
          <button>Add preview order</button>
        </form>
      </section>
    </Frame>
  );
}
