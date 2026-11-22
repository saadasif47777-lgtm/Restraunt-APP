"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChefHat,
  CookingPot,
  Ellipsis,
  ExternalLink,
  Eye,
  Grid2X2,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  Menu,
  Plus,
  QrCode,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Store,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import { api, photoUrl } from "./api";
import { blank, type Draft, type Dish, type Workspace } from "./menu/types";
import CategoryEditor from "./menu/CategoryEditor";
import DishEditor from "./menu/DishEditor";
import ImportPanel from "./menu-import/ImportPanel";
import BranchSettings from "./settings/BranchSettings";

import KitchenStations from "./stations/KitchenStations";
import TableQR from "./tables/TableQR";
import { MenuView } from "../customer-menu/CustomerMenuScreen";
const dev = process.env.NODE_ENV === "development";
const links = [
  ["Menu manager", BookOpen],
  ["Menu imports", Upload],
  ["Tables & QR", QrCode],
  ["Kitchen stations", ChefHat],
  ["Settings", Settings2],
] as const;
const words: Record<string, string> = {
  "Menu manager": "Build, organize, and publish your restaurant menu.",
  "Menu imports": "Bring existing menus into your editable draft.",
  "Tables & QR": "Create stable menu links for your dining tables.",
  "Kitchen stations": "Manage the stations that prepare your dishes.",
  Settings: "Update restaurant branches and operating details.",
};
type Branch = { id: string; name: string; restaurant: string };
function Brand() {
  return (
    <div className="brand">
      <span>
        <CookingPot size={24} strokeWidth={2} />
      </span>
      Tablelane<i>.</i>
    </div>
  );
}
export default function AdminWorkspaceScreen() {
  const [w, setW] = useState<Workspace>(),
    [branch, setBranch] = useState(""),
    [branches, setBranches] = useState<Branch[]>([]),
    [restaurant, setRestaurant] = useState(""),
    [tab, setTab] = useState("Menu manager"),
    [modal, open] = useState(""),
    [dish, edit] = useState<Dish>(),
    [msg, note] = useState(""),
    [busy, wait] = useState(false),
    [search, setSearch] = useState(""),
    [cat, setCat] = useState("All categories"),
    [status, setStatus] = useState("All statuses"),
    [filter, filters] = useState(false),
    [grid, setGrid] = useState(false),
    [side, sidebar] = useState(false),
    [page, paginate] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal]);
  async function load(id: string) {
    const value = await api("/branches/" + id);
    sessionStorage.setItem("tablelane.branch", id);
    setBranch(id);
    setW(value);
  }
  async function initialize() {
    const list: Branch[] = await api("/branches");
    if (!list.length)
      throw Error(
        "Initialize the private test workspace using python -m app.bootstrap.",
      );
    setBranches(list);
    const selected = sessionStorage.getItem("tablelane.branch");
    const first = list.find((b) => b.id === selected) || list[0];
    setRestaurant(first.restaurant);
    await load(first.id);
  }
  useEffect(() => {
    initialize().catch((e) => note(e.message));
  }, []);
  const base = "/branches/" + branch;
  async function action(fn: () => Promise<void>) {
    note("");
    wait(true);
    try {
      await fn();
    } catch (e) {
      note(e instanceof Error ? e.message : String(e));
    } finally {
      wait(false);
    }
  }
  async function save(draft: Draft) {
    if (!w) return;
    const revision = (
      await api(base + "/draft", "PUT", { draft, revision: w.revision })
    ).revision;
    setW({ ...w, draft, revision });
    open("");
    note("Draft saved.");
  }
  function navigate(t: string) {
    setTab(t);
    sidebar(false);
    note("");
    open("");
  }
  if (!w)
    return (
      <main className="auth">
        <Brand />
        {msg ? (
          <>
            <p role="alert">{msg}</p>
            <button disabled={busy} onClick={() => action(initialize)}>
              Retry workspace
            </button>
          </>
        ) : (
          <p>Loading workspace…</p>
        )}
      </main>
    );
  const dishes = w.draft.dishes.filter((d) => !d.archived),
    available = dishes.filter((d) => d.available).length;
  const shown = dishes.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) &&
      (cat === "All categories" || cat === d.category) &&
      (status === "All statuses" || d.available === (status === "Available")),
  );
  const pages = Math.max(1, Math.ceil(shown.length / 8)),
    current = Math.min(pages, page);
  const newDish = () => {
    edit(blank(w.draft.categories[0] || "Mains"));
    open("Add dish");
  };
  async function setting(
    fn: (f: FormData) => Promise<void>,
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await action(async () => {
      await fn(f);
      await load(branch);
      setBranches(await api("/branches"));
      open("");
      note("Changes saved.");
    });
  }
  const detail = dish && w.draft.dishes.find((d) => d.id === dish.id);
  return (
    <div className="app">
      {side && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => sidebar(false)}
        />
      )}
      <aside className={side ? "open" : ""}>
        <Brand />
        <button className="location" onClick={() => open("Select branch")}>
          <span className="store">
            <Store size={19} />
          </span>
          <span>
            <b>{restaurant}</b>
            <small>{w.name}</small>
          </span>
          <ChevronsUpDown size={14} />
        </button>
        <div className="navlabel">WORKSPACE</div>
        <nav>
          {links.slice(0, 4).map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "selected" : ""}
              onClick={() => navigate(name)}
            >
              <Icon />
              {name}
            </button>
          ))}
        </nav>
        <div className="navlabel">MANAGEMENT</div>
        <nav>
          {links.slice(4).map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "selected" : ""}
              onClick={() => navigate(name)}
            >
              <Icon />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidefoot">
          {dev && (
            <button onClick={() => open("Development previews")}>
              <Layers size={17} />
              Development previews
            </button>
          )}
        </div>
      </aside>
      <div className="body">
        <header>
          <button
            className="burger"
            onClick={() => sidebar(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <span className="bread">
            <LayoutGrid size={15} /> Workspace <ChevronRight size={13} />{" "}
            <b>{tab}</b>
          </span>
          <button className="branch" onClick={() => open("Select branch")}>
            <MapPin size={15} />
            {w.name}
            <ChevronDown size={14} />
          </button>
        </header>
        <main className="content">
          <div className="pagehead">
            <div>
              <div className="eyebrow">
                <span /> RESTAURANT WORKSPACE
              </div>
              <h1>{tab}</h1>
              <p>{words[tab]}</p>
            </div>
            {tab === "Menu manager" && (
              <button className="primary" onClick={() => open("Publish menu")}>
                <Send size={16} />
                Publish menu
              </button>
            )}
          </div>
          {msg && !modal && (
            <div className="notice" role="status">
              {msg}
              <button onClick={() => note("")} aria-label="Dismiss message">
                <X size={14} />
              </button>
            </div>
          )}
          {tab === "Menu manager" ? (
            <>
              <section className="hero">
                <div className="heroText">
                  <div className="heroTag">
                    <BookOpen size={13} /> MENU COLLECTION
                  </div>
                  <h2>The House Menu</h2>
                  <p>
                    <Store size={14} />
                    {restaurant}
                    <i /> {w.name}
                  </p>
                  <button onClick={() => open("Menu preview")}>
                    <Eye size={15} />
                    Preview menu
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="heroPhoto">
                  {dishes.some((d) => d.photo) ? (
                    <img
                      src={photoUrl(dishes.find((d) => d.photo)!.photo, true)}
                      alt="House menu specialty"
                    />
                  ) : (
                    <CookingPot size={72} />
                  )}
                </div>
              </section>
              <div className="stats">
                {[
                  [Utensils, "Total dishes", dishes.length, "sage"],
                  [Layers, "Categories", w.draft.categories.length, "sand"],
                  [Check, "Available", available, "green"],
                  [CookingPot, "Sold out", dishes.length - available, "rose"],
                ].map(([I, title, num, color]) => {
                  const Icon = I as typeof Utensils;
                  return (
                    <div className="stat" key={String(title)}>
                      <span className={"statIcon " + color}>
                        <Icon size={19} />
                      </span>
                      <div>
                        <small>{String(title)}</small>
                        <strong>{String(num).padStart(2, "0")}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
              <section className="catalog">
                <div className="catalogHead">
                  <div>
                    <h2>Menu items</h2>
                    <small>{dishes.length} dishes in your menu</small>
                  </div>
                  <div className="actions">
                    <button onClick={() => navigate("Menu imports")}>
                      <Upload size={15} />
                      Import menu
                    </button>
                    <button className="primary" onClick={newDish}>
                      <Plus size={16} />
                      Add dish
                    </button>
                  </div>
                </div>
                <div className="tools">
                  <div className="search">
                    <Search size={16} />
                    <input
                      placeholder="Search dishes..."
                      aria-label="Search dishes"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        paginate(1);
                      }}
                    />
                  </div>
                  <select
                    aria-label="Filter category"
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                  >
                    {["All categories", ...w.draft.categories].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    className={filter ? "active" : ""}
                    onClick={() => filters(!filter)}
                  >
                    <SlidersHorizontal size={14} />
                    Filters
                  </button>
                  <div className="viewModes">
                    <button
                      className={!grid ? "on" : ""}
                      aria-label="List view"
                      onClick={() => setGrid(false)}
                    >
                      <List size={16} />
                    </button>
                    <button
                      className={grid ? "on" : ""}
                      aria-label="Grid view"
                      onClick={() => setGrid(true)}
                    >
                      <Grid2X2 size={15} />
                    </button>
                  </div>
                </div>
                {filter && (
                  <div className="chips">
                    {["All statuses", "Available", "Sold out"].map((s) => (
                      <button
                        key={s}
                        className={s === status ? "active" : ""}
                        onClick={() => setStatus(s)}
                      >
                        {s}
                      </button>
                    ))}
                    <button onClick={() => open("Manage categories")}>
                      Manage categories
                    </button>
                  </div>
                )}
                <div className={grid ? "dishgrid" : "dishlist"}>
                  {!grid && (
                    <div className="thead">
                      <span>Dish name</span>
                      <span>Category</span>
                      <span>Price</span>
                      <span>Status</span>
                      <span />
                    </div>
                  )}
                  {shown.slice((current - 1) * 8, current * 8).map((d) => (
                    <div className="dishrow" key={d.id}>
                      <button
                        className="itemname"
                        onClick={() => {
                          edit(d);
                          open("Edit dish");
                        }}
                      >
                        {d.photo ? (
                          <img alt="" src={photoUrl(d.photo, true)} />
                        ) : (
                          <span className="noimage">
                            <Utensils />
                          </span>
                        )}
                        <span>
                          <strong>{d.name}</strong>
                          <small>{d.description || d.station}</small>
                        </span>
                      </button>
                      <span>
                        <em
                          className={
                            "category c" +
                            (w.draft.categories.indexOf(d.category) % 5)
                          }
                        >
                          {d.category}
                        </em>
                      </span>
                      <span className="price">
                        <small>{w.currency} </small>
                        {d.portions[0].price?.toLocaleString() ?? "Review"}
                      </span>
                      <button
                        title="Toggle availability"
                        className={"status " + (d.available ? "yes" : "no")}
                        onClick={() =>
                          action(() =>
                            save({
                              ...w.draft,
                              dishes: w.draft.dishes.map((x) =>
                                x.id === d.id
                                  ? { ...x, available: !x.available }
                                  : x,
                              ),
                            }),
                          )
                        }
                      >
                        <i />
                        {d.available ? "Available" : "Sold out"}
                      </button>
                      <button
                        className="more"
                        aria-label={"Options for " + d.name}
                        onClick={() => {
                          edit(d);
                          open("Dish options");
                        }}
                      >
                        <Ellipsis size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                {!shown.length && <p className="empty">No dishes found.</p>}
                <footer>
                  <small>
                    {shown.length
                      ? (current - 1) * 8 +
                        1 +
                        "–" +
                        Math.min(current * 8, shown.length)
                      : 0}{" "}
                    of {shown.length} dishes
                  </small>
                  <div>
                    <button
                      disabled={current <= 1}
                      aria-label="Previous page"
                      onClick={() => paginate(current - 1)}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      disabled={current >= pages}
                      aria-label="Next page"
                      onClick={() => paginate(current + 1)}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </footer>
              </section>
            </>
          ) : (
            <section className="panel" key={branch}>
              {tab === "Menu imports" && (
                <ImportPanel base={base} draft={w.draft} apply={save} />
              )}
              {tab === "Tables & QR" && (
                <>
                  <button className="primary" onClick={() => open("Add table")}>
                    <Plus size={15} />
                    Add table
                  </button>
                  {w.tables.map((t) => (
                    <TableQR
                      key={t.id}
                      {...t}
                      publicBase={w.public_menu_base_url}
                    />
                  ))}
                </>
              )}
              {tab === "Kitchen stations" && (
                <KitchenStations
                  stations={w.stations}
                  add={() => open("Add station")}
                />
              )}
              {tab === "Settings" && (
                <BranchSettings
                  restaurant={restaurant}
                  rename={() => open("Restaurant name")}
                  w={w}
                  onCreate={() => open("Create branch")}
                  onSave={(e) =>
                    setting(async (f) => {
                      const v = {
                        name: String(f.get("name")),
                        hours: String(f.get("hours")),
                        currency: String(f.get("currency")),
                        stations: w.stations,
                      };
                      await api(base + "/settings", "PUT", v);
                    }, e)
                  }
                />
              )}
            </section>
          )}
        </main>
      </div>
      <dialog ref={dialog} onCancel={() => open("")}>
        <div className="dialoghead">
          <h2>{modal}</h2>
          <button aria-label="Close" onClick={() => open("")}>
            <X size={18} />
          </button>
        </div>
        {msg && <p role="status">{msg}</p>}
        {["Add dish", "Edit dish"].includes(modal) && dish && (
          <DishEditor
            branch={branch}
            initial={dish}
            categories={w.draft.categories}
            stations={w.stations}
            onSave={(d) =>
              action(() =>
                save({
                  categories: [...new Set([...w.draft.categories, d.category])],
                  dishes: detail
                    ? w.draft.dishes.map((x) => (x.id === d.id ? d : x))
                    : [...w.draft.dishes, d],
                }),
              )
            }
          />
        )}
        {modal === "Dish options" && detail && (
          <div className="optionlist">
            <button onClick={() => open("Edit dish")}>Edit dish</button>
            <label>
              Display position
              <select
                value={w.draft.dishes.indexOf(detail)}
                onChange={(e) => {
                  const list = w.draft.dishes.filter((d) => d.id !== detail.id);
                  list.splice(+e.target.value, 0, detail);
                  action(() => save({ ...w.draft, dishes: list }));
                }}
              >
                {w.draft.dishes.map((d, i) => (
                  <option key={d.id} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() =>
                action(() =>
                  save({
                    ...w.draft,
                    dishes: w.draft.dishes.map((d) =>
                      d.id === detail.id ? { ...d, archived: true } : d,
                    ),
                  }),
                )
              }
            >
              Archive dish
            </button>
          </div>
        )}
        {modal === "Manage categories" && (
          <CategoryEditor draft={w.draft} save={save} />
        )}
        {modal === "Menu preview" && (
          <MenuView
            privatePreview
            menu={{
              ...w.draft,
              restaurant,
              branch: w.name,
              table: "Draft preview",
              currency: w.currency,
            }}
          />
        )}
        {modal === "Publish menu" && (
          <>
            <p>Update all table menus with this draft.</p>
            <div className="record">
              {dishes.length} dishes · {w.draft.categories.length} categories
            </div>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await api(base + "/publish", "POST", {
                    revision: w.revision,
                  });
                  setW({ ...w, live: true });
                  open("");
                  note("Menu published to all tables.");
                })
              }
            >
              Publish menu
            </button>
          </>
        )}
        {modal === "Select branch" &&
          branches.map((b) => (
            <button
              key={b.id}
              onClick={() =>
                action(async () => {
                  await load(b.id);
                  setSearch("");
                  setCat("All categories");
                  setStatus("All statuses");
                  paginate(1);
                  setRestaurant(b.restaurant);
                  open("");
                })
              }
            >
              {b.restaurant} · {b.name}
            </button>
          ))}
        {[
          "Add table",
          "Add station",
          "Create branch",
          "Restaurant name",
        ].includes(modal) && (
          <form
            onSubmit={(e) =>
              setting(async (f) => {
                const name = String(f.get("name"));
                if (modal === "Restaurant name") {
                  await api(base + "/restaurant", "PUT", { name });
                  setRestaurant(name);
                }
                if (modal === "Add table") {
                  await api(base + "/tables", "POST", { name });
                }
                if (modal === "Add station") {
                  const stations = [...new Set([...w.stations, name])];
                  await api(base + "/settings", "PUT", {
                    name: w.name,
                    currency: w.currency,
                    hours: w.hours,
                    stations,
                  });
                }
                if (modal === "Create branch") {
                  await api(base + "/branches", "POST", { name });
                  setBranches(await api("/branches"));
                }
              }, e)
            }
          >
            <label>
              Name
              <input required name="name" />
            </label>
            <button disabled={busy} className="primary">
              {modal}
            </button>
          </form>
        )}
        {modal === "Development previews" && (
          <div className="optionlist">
            {[
              "table-ordering",
              "waiter-floor",
              "kitchen-display",
              "guest-tracker",
              "billing",
              "reports",
              "guest-experience",
            ].map((m) => (
              <a key={m} href={"/preview/" + m}>
                {m.replaceAll("-", " ")}
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        )}
      </dialog>
    </div>
  );
}
