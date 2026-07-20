"use client";

import { useMemo, useState } from "react";

import { useParkingStore } from "@/hooks/use-parking-store";
import type { ParkingItemStatus } from "@/lib/parking/schemas";
import type { ParkingAction } from "@/lib/parking/transitions";
import { ItemInspector } from "./item-inspector";
import { MissionHeader } from "./mission-header";
import { ParkingLot } from "./parking-lot";
import { StatusTabs } from "./status-tabs";

export function ParkingApp() {
  const store = useParkingStore();
  const [activeStatus, setActiveStatus] = useState<ParkingItemStatus>("parked");

  const counts = useMemo(
    () =>
      store.items.reduce<Record<ParkingItemStatus, number>>(
        (result, item) => ({ ...result, [item.status]: result[item.status] + 1 }),
        { parked: 0, test_driving: 0, garaged: 0, scrapped: 0 },
      ),
    [store.items],
  );

  const filteredItems = useMemo(
    () => store.items.filter((item) => item.status === activeStatus),
    [activeStatus, store.items],
  );

  const selectedItem =
    store.items.find((item) => item.id === store.selectedId) ?? null;

  if (!store.isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--paper)]">
        <MissionHeader analyzeDisabled />
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
          <section
            aria-busy="true"
            aria-label="Loading parking data"
            className="min-h-[24rem] border-2 border-[var(--ink)] bg-[var(--asphalt)] p-6 text-sm font-bold text-white"
          >
            Loading parking data…
          </section>
        </div>
      </main>
    );
  }

  function applySelectedAction(action: ParkingAction) {
    if (!store.selectedId) {
      return { ok: false as const, message: "This parking item could not be found." };
    }

    const result = store.applyAction(store.selectedId, action);
    if (result.ok) {
      const destination: Partial<Record<ParkingAction["type"], ParkingItemStatus>> = {
        start_test_drive: "test_driving",
        return_to_lot: "parked",
        park_in_garage: "garaged",
        tow_away: "scrapped",
      };
      setActiveStatus(destination[action.type] ?? activeStatus);
    }
    return result;
  }

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <MissionHeader analyzeDisabled onReset={store.resetDemo} />
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        {store.storageWarning ? (
          <p role="status" className="mb-4 border-l-4 border-[var(--safety)] bg-white px-4 py-3 text-sm font-bold">
            {store.storageWarning}
          </p>
        ) : null}

        {store.needsReset ? (
          <div className="mb-4 border-2 border-[var(--scrap)] bg-white px-4 py-4">
            <p className="font-black">Stored demo data cannot be read safely.</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">
              Open the settings control and confirm Reset demo data. Your stored value will not
              be overwritten before confirmation.
            </p>
          </div>
        ) : null}

        <section className="overflow-hidden border-2 border-[var(--ink)] bg-white">
          <StatusTabs
            activeStatus={activeStatus}
            counts={counts}
            onChange={(status) => {
              setActiveStatus(status);
              store.selectItem(null);
            }}
          />
          <ParkingLot items={filteredItems} onSelect={store.selectItem} />
        </section>
      </div>

      <ItemInspector
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) store.selectItem(null);
        }}
        onApplyAction={applySelectedAction}
        onUpdateEvidence={(notes, repoUrl) => {
          if (store.selectedId) {
            store.updateEvidence(store.selectedId, notes, repoUrl);
          }
        }}
      />
    </main>
  );
}
