import type { Workspace } from "../menu/types";
export default function BranchSettings({
  restaurant,
  rename,
  w,
  onSave,
  onCreate,
}: {
  restaurant: string;
  rename: () => void;
  w: Workspace;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  onCreate: () => void;
}) {
  return (
    <form onSubmit={onSave}>
      <div className="record">
        <strong>{restaurant}</strong>
        {w.role === "owner" && (
          <button type="button" onClick={rename}>
            Rename restaurant
          </button>
        )}
      </div>
      <label>
        Branch name
        <input name="name" required defaultValue={w.name} />
      </label>
      <label>
        Opening hours
        <input name="hours" defaultValue={w.hours} />
      </label>
      <label>
        Currency
        <input
          name="currency"
          pattern="[A-Z]{3}"
          required
          defaultValue={w.currency}
        />
      </label>
      <button className="primary">Save settings</button>
      {w.role === "owner" && (
        <button type="button" onClick={onCreate}>
          Create branch
        </button>
      )}
    </form>
  );
}
