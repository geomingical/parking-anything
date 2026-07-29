import type { ParkingItem, ParkingItemStatus } from "@/lib/parking/schemas";
import { activityAge } from "@/lib/parking/activity";
import { CarSprite } from "./car-sprite";
import { PARKING_LOT_PANEL_ID, statusTabId } from "./status-tabs";

type ParkingLotProps = {
  items: ParkingItem[];
  now?: Date;
  activeStatus?: ParkingItemStatus;
  onSelect(id: string, trigger: HTMLButtonElement): void;
};

export function ParkingLot({
  items,
  onSelect,
  activeStatus,
  now = new Date(),
}: ParkingLotProps) {
  return (
    <section
      id={PARKING_LOT_PANEL_ID}
      role="tabpanel"
      aria-labelledby={activeStatus ? statusTabId(activeStatus) : undefined}
      aria-label={activeStatus ? undefined : "Parking lot"}
      className="parking-surface min-h-[24rem] p-4 sm:p-6"
    >
      {items.length > 0 ? (
        <div className="parking-grid">
          {items.map((item, index) => {
            const active = item.status === "parked" || item.status === "test_driving";
            const age = activityAge(item.lastActivityAt, now);
            return <CarSprite key={item.id} item={item} onSelect={onSelect} enterIndex={index} daysSinceActivity={age.daysSinceActivity} needsReview={active && age.needsReview} />;
          })}
        </div>
      ) : (
        <div className="empty-lot reveal">
          <p className="m-0 px-4 text-center text-sm font-bold text-white/80">
            No cars are waiting in this zone.
          </p>
        </div>
      )}
    </section>
  );
}
