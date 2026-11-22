"use client";
import { useState } from "react";
import Frame from "../PreviewWorkspace";
import { data } from "./data";
export default function ReportsScreen() {
  const [branch, select] = useState("Gulberg"),
    [day, date] = useState("2026-11-22");
  const match = data.shifts.find((s) => s.branch === branch && s.day === day);
  return (
    <Frame title="Reports">
      <section>
        <label>
          Branch
          <select value={branch} onChange={(e) => select(e.target.value)}>
            <option>Gulberg</option>
            <option>DHA</option>
          </select>
        </label>
        <label>
          Shift date
          <input
            type="date"
            value={day}
            onChange={(e) => date(e.target.value)}
          />
        </label>
        {match ? (
          <>
            <h2>Shift summary</h2>
            {Object.entries(match.totals).map(([k, v]) => (
              <div className="record" key={k}>
                {k}
                <b>{v}</b>
              </div>
            ))}
          </>
        ) : (
          <p>No fixture shift for this selection.</p>
        )}
      </section>
    </Frame>
  );
}
