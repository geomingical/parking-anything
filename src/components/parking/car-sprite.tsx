import Image from "next/image";

import type { EffortTier, ParkingItem } from "@/lib/parking/schemas";

const CAR_IMAGES: Record<EffortTier, string> = {
  quick_spin: "/cars/quick-spin.png",
  focused_session: "/cars/focused-session.png",
  weekend_project: "/cars/weekend-project.png",
};

const STATUS_LABELS: Record<ParkingItem["status"], string> = {
  parked: "Parked",
  test_driving: "Test Driving",
  garaged: "Garaged",
  scrapped: "Scrapped",
};

type CarSpriteProps = {
  item: ParkingItem;
  onSelect(id: string): void;
};

export function CarSprite({ item, onSelect }: CarSpriteProps) {
  const statusLabel = STATUS_LABELS[item.status];

  return (
    <button
      type="button"
      aria-label={`${item.title}, ${statusLabel}`}
      onClick={() => onSelect(item.id)}
      className="group flex h-full min-w-0 flex-col items-center justify-between overflow-hidden border border-white/50 bg-[var(--asphalt-deep)]/75 px-3 py-3 text-white transition-colors hover:border-[var(--safety)] hover:bg-[var(--asphalt-deep)]"
    >
      <span className="relative min-h-0 w-full flex-1">
        <Image
          src={CAR_IMAGES[item.effortTier]}
          alt=""
          fill
          sizes="(max-width: 640px) 42vw, 10rem"
          className="object-contain transition-transform group-hover:-translate-y-1"
        />
      </span>
      <span className="mt-1 w-full truncate text-sm font-bold" title={item.title}>
        {item.title}
      </span>
      <span className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--safety)]">
        {statusLabel}
      </span>
    </button>
  );
}
