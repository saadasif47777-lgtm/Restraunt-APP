"use client";
import { useState } from "react";
import Frame from "../PreviewWorkspace";
import { data } from "./data";
export default function KitchenDisplayScreen() {
  const [station, filter] = useState("All stations"),
    [state, set] = useState<Record<string, string>>({});
  return (
    <Frame title="Kitchen display">
      <section>
        <small>Connection · Local fixture</small>
        <div className="chips">
          {["All stations", "Curry", "Grill"].map((s) => (
            <button
              className={station === s ? "active" : ""}
              onClick={() => filter(s)}
              key={s}
            >
              {s}
            </button>
          ))}
        </div>
      </section>
      {["Curry", "Grill"]
        .filter((s) => station === "All stations" || s === station)
        .map((s, i) => (
          <section className="kitchen" key={s}>
            <small>{s} · 6 min elapsed</small>
            <h2>Table {s === "Curry" ? 5 : 6}</h2>
            <h3>{s === "Curry" ? data.item : "Chicken Tikka"}</h3>
            <p style={{ color: "white" }}>Less chilli · Extra ginger</p>
            <strong>{state[s] || "Incoming"}</strong>
            <div>
              <button
                disabled={state[s] === "Ready"}
                onClick={() =>
                  set({
                    ...state,
                    [s]: state[s] === "Preparing" ? "Ready" : "Preparing",
                  })
                }
              >
                {state[s] === "Preparing" ? "Mark ready" : "Start preparing"}
              </button>
            </div>
          </section>
        ))}
    </Frame>
  );
}
