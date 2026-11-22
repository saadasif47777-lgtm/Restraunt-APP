import { ChefHat, Plus } from "lucide-react";
export default function KitchenStations({
  stations,
  add,
}: {
  stations: string[];
  add: () => void;
}) {
  return (
    <>
      <button className="primary" onClick={add}>
        <Plus size={15} />
        Add station
      </button>
      {stations.map((s) => (
        <div className="record" key={s}>
          <ChefHat size={18} />
          {s}
        </div>
      ))}
    </>
  );
}
