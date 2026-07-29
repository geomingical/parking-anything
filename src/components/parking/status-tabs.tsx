"use client";

import { useRef } from "react";

import type { ParkingItemStatus } from "@/lib/parking/schemas";

/*
 * Garage and Scrapyard are outcomes, not just filters, so they carry their own
 * semantic colour here. Yellow is reserved for attention states on the cards.
 */
const TABS: ReadonlyArray<{
  status: ParkingItemStatus;
  label: string;
  selectedClass: string;
}> = [
  { status: "parked", label: "Parking Lot", selectedClass: "bg-[var(--asphalt-deep)] text-white" },
  { status: "test_driving", label: "Test Driving", selectedClass: "bg-[var(--asphalt-deep)] text-white" },
  { status: "garaged", label: "Garage", selectedClass: "bg-[var(--garage)] text-white" },
  { status: "scrapped", label: "Scrapyard", selectedClass: "bg-[var(--scrap)] text-white" },
];

/** The lot is one panel whose contents swap, so every tab controls it. */
export const PARKING_LOT_PANEL_ID = "parking-lot-panel";

export function statusTabId(status: ParkingItemStatus): string {
  return `parking-status-tab-${status}`;
}

type StatusTabsProps = {
  activeStatus: ParkingItemStatus;
  counts: Record<ParkingItemStatus, number>;
  onChange(status: ParkingItemStatus): void;
};

export function StatusTabs({ activeStatus, counts, onChange }: StatusTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveTo(nextIndex: number) {
    onChange(TABS[nextIndex].status);
    refs.current[nextIndex]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const lastIndex = TABS.length - 1;
    switch (event.key) {
      case "ArrowRight":
        moveTo((index + 1) % TABS.length);
        break;
      case "ArrowLeft":
        moveTo((index - 1 + TABS.length) % TABS.length);
        break;
      case "Home":
        moveTo(0);
        break;
      case "End":
        moveTo(lastIndex);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div
      role="tablist"
      aria-label="Parking status filters"
      className="grid grid-cols-2 border-b border-black/15 bg-white sm:grid-cols-4"
    >
      {TABS.map(({ status, label, selectedClass }, index) => {
        const selected = status === activeStatus;
        return (
          <button
            key={status}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={statusTabId(status)}
            type="button"
            role="tab"
            aria-label={`${label} ${counts[status]}`}
            aria-selected={selected}
            aria-controls={PARKING_LOT_PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => onChange(status)}
            className={`pressable press-subtle flex h-14 items-center justify-between gap-2 border-r border-black/10 px-4 text-left text-sm font-bold last:border-r-0 ${
              selected ? selectedClass : "bg-white text-[var(--ink)] hover:bg-black/5"
            }`}
          >
            <span>{label}</span>
            <span
              className={`tint inline-flex min-w-7 justify-center px-2 py-1 text-xs ${
                selected ? "bg-white/20 text-white" : "bg-black/10"
              }`}
            >
              {counts[status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
