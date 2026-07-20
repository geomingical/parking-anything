import type { ParkingItem } from "@/lib/parking/schemas";
import { CarSprite } from "./car-sprite";

type ParkingLotProps = {
  items: ParkingItem[];
  onSelect(id: string): void;
};

export function ParkingLot({ items, onSelect }: ParkingLotProps) {
  return (
    <section aria-label="AI tools parking lot" className="parking-surface min-h-[24rem] p-4 sm:p-6">
      {items.length > 0 ? (
        <div className="parking-grid">
          {items.map((item) => (
            <CarSprite key={item.id} item={item} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <p className="m-0 px-2 py-12 text-center text-sm font-bold text-white">
          No cars are waiting in this zone.
        </p>
      )}
    </section>
  );
}
