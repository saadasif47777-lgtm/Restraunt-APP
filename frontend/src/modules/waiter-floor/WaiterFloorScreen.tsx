"use client";
import { useState } from "react";
import Frame from "../PreviewWorkspace";
import { sampleTables, type TableAction } from "./data";
export default function WaiterFloorScreen() {
  const [tables, update] = useState(sampleTables),
    [number, select] = useState(5),
    [dish, edit] = useState("");
  const table = tables.find((t) => t.number === number)!;
  function transition(action: TableAction, item = table.item) {
    update(
      tables.map((t) =>
        t.number === number ? { ...t, action, item, minutes: 0 } : t,
      ),
    );
  }
  return (
    <Frame title="Waiter floor">
      <div className="floor-grid">
        {tables.map((t) => (
          <button
            key={t.number}
            className={t.number === number ? "active" : ""}
            onClick={() => {
              select(t.number);
              edit("");
            }}
          >
            <b>Table {t.number}</b>
            <span>{t.action}</span>
            <small>{t.minutes} min</small>
          </button>
        ))}
      </div>
      <section>
        <h2>Table {number}</h2>
        <small>{table.minutes} min elapsed</small>
        <h3>{table.action}</h3>
        <p>{table.item}</p>
        {table.action === "Incoming order" && (
          <button
            className="primary"
            onClick={() => transition("Sent to kitchen")}
          >
            Approve and send
          </button>
        )}
        {table.action === "Ready to serve" && (
          <button className="primary" onClick={() => transition("Served")}>
            Mark served
          </button>
        )}
        {table.action.endsWith("request") && (
          <button
            className="primary"
            onClick={() => transition("Acknowledged")}
          >
            Acknowledge request
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            transition("Incoming order", dish.trim());
            edit("");
          }}
        >
          <label>
            Waiter-entered dish
            <input
              required
              value={dish}
              onChange={(e) => edit(e.target.value)}
            />
          </label>
          <button disabled={!dish.trim()}>Add preview order</button>
        </form>
      </section>
    </Frame>
  );
}
