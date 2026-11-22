import { useState } from "react";
import type { Dish, Draft } from "../menu/types";

export default function RevisionReview({
  rows,
  draft,
  apply,
}: {
  rows: Dish[];
  draft: Draft;
  apply: (value: Draft) => Promise<void>;
}) {
  const [replacement, replace] = useState(false),
    [remove, mark] = useState<string[]>([]),
    [error, fail] = useState("");
  const key = (s: string) => s.trim().toLocaleLowerCase();
  const matches = rows.map((row) => ({
    row,
    existing: draft.dishes.find(
      (d) => !d.archived && key(d.name) === key(row.name),
    ),
  }));
  const absent = draft.dishes.filter(
    (d) => !d.archived && !matches.some((m) => m.existing?.id === d.id),
  );
  async function commit() {
    const changes = new Map<string, Dish>(),
      added: Dish[] = [];
    for (const { row, existing } of matches) {
      if (replacement && existing) {
        if (existing.portions.length !== 1)
          throw Error(
            "Review multi-portion dishes in the menu editor before applying a revised price. Remove that row from the import to keep its existing options.",
          );
        changes.set(existing.id, {
          ...existing,
          station: row.station || existing.station,
          portions: [{ ...existing.portions[0], price: row.portions[0].price }],
        });
      } else added.push(row);
    }
    const updated = draft.dishes.map(
      (d) =>
        changes.get(d.id) ||
        (replacement && remove.includes(d.id) ? { ...d, archived: true } : d),
    );
    await apply({
      categories: Array.from(
        new Set([...draft.categories, ...added.map((d) => d.category)]),
      ),
      dishes: [...updated, ...added],
    });
  }
  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={replacement}
          onChange={(e) => replace(e.target.checked)}
        />{" "}
        Compare as a revised menu
      </label>
      {replacement && (
        <>
          <h3>Proposed changes</h3>
          {matches.map(({ row, existing }) => (
            <p key={row.id}>
              {row.name} ·{" "}
              {existing
                ? "Price " +
                  existing.portions
                    .map((p) => p.price ?? "unclear")
                    .join(" / ") +
                  " → " +
                  (row.portions[0].price ?? "review")
                : "Addition"}
            </p>
          ))}
          {absent.length > 0 && (
            <>
              <h3>Missing from revised menu</h3>
              <small>Select dishes to archive.</small>
              {absent.map((d) => (
                <label key={d.id}>
                  <input
                    type="checkbox"
                    checked={remove.includes(d.id)}
                    onChange={(e) =>
                      mark(
                        e.target.checked
                          ? [...remove, d.id]
                          : remove.filter((id) => id !== d.id),
                      )
                    }
                  />{" "}
                  {d.name}
                </label>
              ))}
            </>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        className="primary"
        onClick={() => commit().catch((e) => fail(e.message))}
      >
        Apply to draft
      </button>
    </section>
  );
}
