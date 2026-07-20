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
  daysSinceActivity: number;
  needsReview: boolean;
  onSelect(id: string, trigger: HTMLButtonElement): void;
};

export function CarSprite({ item, daysSinceActivity, needsReview, onSelect }: CarSpriteProps) {
  const statusLabel = STATUS_LABELS[item.status];
  const kindLabel = item.kind === "ai_tool" ? "Tool" : "Idea";

  return (
    <button
      type="button"
      aria-label={`${item.title}, ${statusLabel}`}
      onClick={(event) => onSelect(item.id, event.currentTarget)}
      className="group flex h-full min-w-0 flex-col items-center justify-between overflow-hidden border border-white/50 bg-[var(--asphalt-deep)]/75 px-3 py-3 text-white transition-colors hover:border-[var(--safety)] hover:bg-[var(--asphalt-deep)]"
    >
      <span className="relative min-h-0 w-full flex-1">
        {item.effortTier ? (
          <Image
            src={CAR_IMAGES[item.effortTier]}
            alt=""
            fill
            sizes="(max-width: 640px) 42vw, 10rem"
            className="object-contain transition-transform group-hover:-translate-y-1"
          />
        ) : (
          <span className="flex h-full min-h-24 items-center justify-center border-2 border-dashed border-white/55 bg-white/10 px-2 text-center text-xs font-black uppercase tracking-[0.12em]">
            Planning needed
          </span>
        )}
      </span>
      <span className="mt-1 w-full truncate text-sm font-bold" title={item.title}>
        {item.title}
      </span>
      <span className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--safety)]">
        {kindLabel} · {statusLabel}
      </span>
      {needsReview ? (
        <span className="mt-1 text-[0.68rem] font-bold text-white">
          Needs review · {daysSinceActivity} days
        </span>
      ) : null}
    </button>
  );
}
