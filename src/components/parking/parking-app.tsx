"use client";

import { useMemo, useRef, useState } from "react";

import { useParkingStore } from "@/hooks/use-parking-store";
import type { ParkingItemStatus } from "@/lib/parking/schemas";
import type { ParkingAction } from "@/lib/parking/transitions";
import { CaptureSwitcher, type CaptureMode } from "./capture-switcher";
import { IdeaCaptureForm } from "./idea-capture-form";
import { ItemInspector } from "./item-inspector";
import { ManagerPatrol } from "./manager-patrol";
import { MissionHeader } from "./mission-header";
import { ParkingLot } from "./parking-lot";
import { StatusTabs } from "./status-tabs";
import { ToolCaptureForm } from "./tool-capture-form";

export function ParkingApp() {
  const store = useParkingStore();
  const [activeStatus, setActiveStatus] = useState<ParkingItemStatus>("parked");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("tool");
  const itemTrigger = useRef<HTMLButtonElement | null>(null);

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
      <div className="min-h-screen bg-[var(--paper)]">
        <MissionHeader />
        <main>
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
      </div>
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
    <div className="min-h-screen bg-[var(--paper)]">
      <MissionHeader
        onReset={() => {
          store.resetDemo();
          setActiveStatus("parked");
        }}
      />
      <section className="border-b border-black/10 bg-[var(--paper)] px-5 py-5 sm:px-8" aria-label="Park something">
        <div className="mx-auto max-w-7xl">
          <CaptureSwitcher activeMode={captureMode} onChange={setCaptureMode} />
          {captureMode === "tool" ? (
            <ToolCaptureForm onPark={store.addItem} onParked={() => setActiveStatus("parked")} />
          ) : (
            <IdeaCaptureForm onPark={store.addItem} onParked={() => setActiveStatus("parked")} />
          )}
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
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

        <ManagerPatrol
          items={store.items}
          onSelect={(id) => {
            const item = store.items.find((candidate) => candidate.id === id);
            if (item) setActiveStatus(item.status);
            store.selectItem(id);
          }}
        />

        <section className="overflow-hidden border-2 border-[var(--ink)] bg-white">
          <StatusTabs
            activeStatus={activeStatus}
            counts={counts}
            onChange={(status) => {
              setActiveStatus(status);
              store.selectItem(null);
            }}
          />
          <ParkingLot
            items={filteredItems}
            onSelect={(id, trigger) => {
              itemTrigger.current = trigger;
              store.selectItem(id);
            }}
          />
        </section>
      </main>

      <ItemInspector
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            store.selectItem(null);
            requestAnimationFrame(() => itemTrigger.current?.focus());
          }
        }}
        onApplyAction={applySelectedAction}
        onUpdateEvidence={(notes, resultUrl) => {
          if (store.selectedId) {
            store.updateEvidence(store.selectedId, notes, resultUrl);
          }
        }}
      />
    </div>
  );
}
