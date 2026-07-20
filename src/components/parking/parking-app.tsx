"use client";

import { makeSeedItems } from "@/lib/parking/fixtures";
import { MissionHeader } from "./mission-header";
import { ParkingLot } from "./parking-lot";
import { StatusTabs } from "./status-tabs";

const previewItems = makeSeedItems();

export function ParkingApp() {
  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <MissionHeader disabled />
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        <section className="overflow-hidden border-2 border-[var(--ink)] bg-white">
          <StatusTabs
            activeStatus="parked"
            counts={{ parked: 1, test_driving: 1, garaged: 1, scrapped: 0 }}
            onChange={() => undefined}
          />
          <ParkingLot items={previewItems} onSelect={() => undefined} />
        </section>
      </div>
    </main>
  );
}
