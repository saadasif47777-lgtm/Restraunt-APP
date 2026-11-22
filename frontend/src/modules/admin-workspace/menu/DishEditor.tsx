import { useState } from "react";
import type { Dish, Portion } from "./types";
export function Prices({
  value,
  onChange,
}: {
  value: Portion[];
  onChange: (v: Portion[]) => void;
}) {
  return (
    <>
      {value.map((p, i) => (
        <div className="line" key={i}>
          <input
            required
            aria-label="Option name"
            value={p.name}
            onChange={(e) =>
              onChange(
                value.map((r, j) =>
                  i === j ? { ...r, name: e.target.value } : r,
                ),
              )
            }
          />
          <input
            aria-label="Price"
            type="number"
            min="0"
            step=".01"
            required
            value={p.price ?? ""}
            onChange={(e) =>
              onChange(
                value.map((r, j) =>
                  i === j
                    ? {
                        ...r,
                        price:
                          e.target.value === "" ? null : Number(e.target.value),
                      }
                    : r,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { name: "", price: null }])}
      >
        + Add option
      </button>
    </>
  );
}
export default function DishEditor({
  initial,
  categories,
  stations,
  onSave,
}: {
  initial: Dish;
  categories: string[];
  stations: string[];
  onSave: (d: Dish) => void;
}) {
  const [d, set] = useState(initial);
  const patch = (v: Partial<Dish>) => set({ ...d, ...v });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (d.portions.length) onSave(d);
      }}
    >
      <label>
        Dish name
        <input
          required
          value={d.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          value={d.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </label>
      <div className="line">
        <label>
          Category
          <input
            required
            list="categories"
            value={d.category}
            onChange={(e) => patch({ category: e.target.value })}
          />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </datalist>
        </label>
        <label>
          Station
          <select
            value={d.station}
            onChange={(e) => patch({ station: e.target.value })}
          >
            <option value="">Unassigned</option>
            {stations.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>Portions and prices</label>
      <Prices value={d.portions} onChange={(p) => patch({ portions: p })} />
      <details>
        <summary>Modifiers, photos and dietary details</summary>
        {Object.entries(d.modifiers).map(([group, options]) => (
          <section key={group}>
            <b>{group}</b>
            <Prices
              value={options}
              onChange={(v) =>
                patch({ modifiers: { ...d.modifiers, [group]: v } })
              }
            />
          </section>
        ))}
        <button
          type="button"
          onClick={() => {
            const n = prompt("Modifier group name");
            if (n) patch({ modifiers: { ...d.modifiers, [n]: [] } });
          }}
        >
          Add modifier group
        </button>
        <label>
          Photo URL
          <input
            value={d.photo}
            onChange={(e) => patch({ photo: e.target.value })}
          />
        </label>
        <label>
          Deal details
          <input
            value={d.deal || ""}
            onChange={(e) => patch({ deal: e.target.value })}
          />
        </label>
        <label>
          Spice level
          <input
            value={d.spice}
            onChange={(e) => patch({ spice: e.target.value })}
          />
        </label>
        <label>
          Confirmed allergens (comma separated)
          <input
            value={d.allergens.join(",")}
            onChange={(e) =>
              patch({ allergens: e.target.value.split(",").filter(Boolean) })
            }
          />
        </label>
      </details>
      <label>
        <input
          type="checkbox"
          checked={d.available}
          onChange={(e) => patch({ available: e.target.checked })}
        />{" "}
        Available
      </label>
      <button className="primary" disabled={!d.portions.length}>
        Save dish
      </button>
    </form>
  );
}
