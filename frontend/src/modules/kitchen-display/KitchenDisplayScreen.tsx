"use client";
import { useEffect, useState } from "react";
import Frame from "../PreviewWorkspace";
import { tickets } from "./data";
export default function KitchenDisplayScreen() {
  const [station, filter] = useState("All stations"),
    [states, set] = useState<Record<number, string>>({}),
    [elapsed, tick] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(
      () => tick(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <Frame title="Kitchen display">
      <section>
        <small>Connection · Local fixture</small>
        <div className="chips">
          {["All stations", "Curry", "Grill"].map((s) => (
            <button
              key={s}
              onClick={() => filter(s)}
              className={s === station ? "active" : ""}
            >
              {s}
            </button>
          ))}
        </div>
      </section>
      {tickets
        .filter((t) => station === "All stations" || t.station === station)
        .map((t) => {
          const seconds = elapsed + t.elapsed,
            state = states[t.table] || "Incoming";
          return (
            <section className="kitchen" key={t.table}>
              <small>
                {t.station} · {Math.floor(seconds / 60)}m{" "}
                {String(seconds % 60).padStart(2, "0")}s
              </small>
              <h2>Table {t.table}</h2>
              <h3>{t.dish}</h3>
              <p style={{ color: "white" }}>{t.note}</p>
              <strong>{state}</strong>
              {state !== "Ready" && (
                <div>
                  <button
                    onClick={() =>
                      set({
                        ...states,
                        [t.table]: state === "Incoming" ? "Preparing" : "Ready",
                      })
                    }
                  >
                    {state === "Incoming" ? "Start preparing" : "Mark ready"}
                  </button>
                </div>
              )}
            </section>
          );
        })}
    </Frame>
  );
}
