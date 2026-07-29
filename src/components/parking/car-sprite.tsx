import Image from "next/image";
import type { CSSProperties } from "react";

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

const EFFORT_LABELS: Record<EffortTier, string> = {
  quick_spin: "Quick spin",
  focused_session: "Focused session",
  weekend_project: "Weekend project",
};

/*
 * Cars cascade in rather than appearing all at once, but the delay is capped so a
 * full lot never makes the last row feel like it is waiting on the first.
 */
const STAGGER_STEP_MS = 40;
const STAGGER_MAX_STEPS = 8;

type CarSpriteProps = {
  item: ParkingItem;
  daysSinceActivity: number;
  needsReview: boolean;
  enterIndex?: number;
  onSelect(id: string, trigger: HTMLButtonElement): void;
};

export function CarSprite({
  item,
  daysSinceActivity,
  needsReview,
  enterIndex = 0,
  onSelect,
}: CarSpriteProps) {
  const statusLabel = STATUS_LABELS[item.status];
  const kindLabel = item.kind === "ai_tool" ? "Tool" : "Idea";
  const enterDelay =
    Math.min(enterIndex, STAGGER_MAX_STEPS) * STAGGER_STEP_MS;

  return (
    <button
      type="button"
      aria-label={`${item.title}, ${statusLabel}`}
      onClick={(event) => onSelect(item.id, event.currentTarget)}
      style={{ "--enter-delay": `${enterDelay}ms` } as CSSProperties}
      className="car-card car-enter group flex h-full min-w-0 flex-col items-center justify-between overflow-hidden border border-white/50 bg-[var(--asphalt-deep)]/75 px-3 py-2 text-white hover:border-[var(--safety)] hover:bg-[var(--asphalt-deep)]"
    >
      <span className="relative min-h-0 w-full flex-1">
        {item.effortTier ? (
          <Image
            src={CAR_IMAGES[item.effortTier]}
            alt=""
            fill
            sizes="(max-width: 640px) 42vw, 10rem"
            className="car-art object-contain"
          />
        ) : (
          <span className="flex h-full min-h-20 items-center justify-center border-2 border-dashed border-white/55 bg-white/10 px-2 text-center text-xs font-black uppercase tracking-[0.12em]">
            Planning needed
          </span>
        )}
      </span>
      {/*
       * The lot is already filtered by status, so repeating it here would spend
       * the card's scarcest space on what the selected tab already says. The
       * title gets two lines instead, and the review warning gets the accent.
       */}
      <span className="mt-1 line-clamp-2 w-full text-center text-sm font-bold leading-tight" title={item.title}>
        {item.title}
      </span>
      <span className="mt-0.5 w-full truncate text-center text-[0.6rem] font-black uppercase tracking-[0.08em] text-white/60">
        {kindLabel}
        {item.effortTier ? ` · ${EFFORT_LABELS[item.effortTier]}` : ""}
      </span>
      {needsReview ? (
        <span className="mt-1 whitespace-nowrap bg-[var(--safety)] px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.04em] text-black">
          Needs review · {daysSinceActivity} days
        </span>
      ) : null}
    </button>
  );
}
