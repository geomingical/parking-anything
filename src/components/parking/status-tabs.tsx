"use client";

import type { ParkingItemStatus } from "@/lib/parking/schemas";

const TABS: ReadonlyArray<{ status: ParkingItemStatus; label: string }> = [
  { status: "parked", label: "Parking Lot" },
  { status: "test_driving", label: "Test Driving" },
  { status: "garaged", label: "Garage" },
  { status: "scrapped", label: "Scrapyard" },
];

type StatusTabsProps = {
  activeStatus: ParkingItemStatus;
  counts: Record<ParkingItemStatus, number>;
  onChange(status: ParkingItemStatus): void;
};

export function StatusTabs({ activeStatus, counts, onChange }: StatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Parking status filters"
      className="grid grid-cols-2 border-b border-black/15 bg-white sm:grid-cols-4"
    >
      {TABS.map(({ status, label }) => {
        const selected = status === activeStatus;
        return (
          <button
            key={status}
            type="button"
            role="tab"
            aria-label={`${label} ${counts[status]}`}
            aria-selected={selected}
            onClick={() => onChange(status)}
            className={`pressable press-subtle flex h-14 items-center justify-between gap-2 border-r border-black/10 px-4 text-left text-sm font-bold last:border-r-0 ${
              selected
                ? "bg-[var(--asphalt-deep)] text-white"
                : "bg-white text-[var(--ink)] hover:bg-black/5"
            }`}
          >
            <span>{label}</span>
            <span
              className={`tint inline-flex min-w-7 justify-center px-2 py-1 text-xs ${
                selected ? "bg-[var(--safety)] text-black" : "bg-black/10"
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
