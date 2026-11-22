"use client";
import { useState } from "react";
import Frame from "../PreviewWorkspace";
import { menu, amount, type CartLine } from "./data";
const line = (id: number): CartLine => ({
  id,
  dish: 0,
  portion: 0,
  quantity: 1,
  extra: false,
  note: "",
});
export default function TableOrderingScreen() {
  const [joined, join] = useState(false),
    [cart, set] = useState<CartLine[]>([line(0)]),
    [round, submit] = useState(0),
    [done, confirm] = useState(false);
  const change = (id: number, values: Partial<CartLine>) =>
    set(cart.map((row) => (row.id === id ? { ...row, ...values } : row)));
  return (
    <Frame title="Table ordering">
      {!joined ? (
        <section>
          <button className="primary" onClick={() => join(true)}>
            Join sample visit
          </button>
        </section>
      ) : done ? (
        <section>
          <h2>Round recorded in preview</h2>
          <p>
            Round {round} · PKR {cart.reduce((v, row) => v + amount(row), 0)}
          </p>
          <button
            onClick={() => {
              set([line(0)]);
              confirm(false);
            }}
          >
            {round === 1 ? "Add second round" : "Add another round"}
          </button>
        </section>
      ) : (
        <>
          <h2>Personal cart</h2>
          {cart.map((row) => {
            const d = menu[row.dish];
            return (
              <section key={row.id}>
                <label>
                  Dish
                  <select
                    value={row.dish}
                    onChange={(e) =>
                      change(row.id, {
                        dish: +e.target.value,
                        portion: 0,
                        extra: false,
                      })
                    }
                  >
                    {menu.map((d, i) => (
                      <option key={d.name} value={i}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Portion
                  <select
                    value={row.portion}
                    onChange={(e) =>
                      change(row.id, { portion: +e.target.value })
                    }
                  >
                    {d.portions.map((p, i) => (
                      <option key={p.name} value={i}>
                        {p.name} · PKR {p.price}
                      </option>
                    ))}
                  </select>
                </label>
                {d.extra && (
                  <label>
                    <input
                      type="checkbox"
                      checked={row.extra}
                      onChange={(e) =>
                        change(row.id, { extra: e.target.checked })
                      }
                    />{" "}
                    {d.extra.name} · PKR {d.extra.price}
                  </label>
                )}
                <label>
                  Quantity
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={row.quantity}
                    onChange={(e) =>
                      change(row.id, {
                        quantity: Math.max(
                          1,
                          Math.min(99, Math.floor(+e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Kitchen notes
                  <textarea
                    value={row.note}
                    onChange={(e) => change(row.id, { note: e.target.value })}
                  />
                </label>
                <div className="record">
                  <strong>PKR {amount(row)}</strong>
                  <button
                    onClick={() => set(cart.filter((x) => x.id !== row.id))}
                  >
                    Remove dish
                  </button>
                </div>
              </section>
            );
          })}
          <button
            onClick={() =>
              set([...cart, line(Math.max(0, ...cart.map((x) => x.id)) + 1)])
            }
          >
            Add another dish
          </button>
          <section>
            <h2>
              Cart total · PKR {cart.reduce((v, row) => v + amount(row), 0)}
            </h2>
            <button
              className="primary"
              disabled={!cart.length}
              onClick={() => {
                submit(round + 1);
                confirm(true);
              }}
            >
              Submit preview round
            </button>
          </section>
        </>
      )}
    </Frame>
  );
}
