import type { ParkingItem } from "@/lib/parking/schemas";
import { activityAge } from "@/lib/parking/activity";
import { CarSprite } from "./car-sprite";

type ParkingLotProps = {
  items: ParkingItem[];
  now?: Date;
  onSelect(id: string, trigger: HTMLButtonElement): void;
};

export function ParkingLot({ items, onSelect, now = new Date() }: ParkingLotProps) {
  return (
    <section aria-label="Parking lot" className="parking-surface min-h-[24rem] p-4 sm:p-6">
      {items.length > 0 ? (
        <div className="parking-grid">
          {items.map((item) => {
            const active = item.status === "parked" || item.status === "test_driving";
            const age = activityAge(item.lastActivityAt, now);
            return <CarSprite key={item.id} item={item} onSelect={onSelect} daysSinceActivity={age.daysSinceActivity} needsReview={active && age.needsReview} />;
          })}
        </div>
      ) : (
        <p className="m-0 px-2 py-12 text-center text-sm font-bold text-white">
          No cars are waiting in this zone.
        </p>
      )}
    </section>
  );
}
