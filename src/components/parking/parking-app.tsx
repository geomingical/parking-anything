"use client";

import { useMemo, useRef, useState } from "react";

import { useParkingStore } from "@/hooks/use-parking-store";
import type { ParkingItemStatus } from "@/lib/parking/schemas";
import type { ParkingAction } from "@/lib/parking/transitions";
import { CaptureSwitcher, type CaptureMode } from "./capture-switcher";
import { IdeaCaptureForm } from "./idea-capture-form";
import { ItemInspector } from "./item-inspector";
import { LinkCaptureForm } from "./link-capture-form";
import { ManagerPatrol } from "./manager-patrol";
import { MissionHeader } from "./mission-header";
import { ParkingLot } from "./parking-lot";
import { StatusTabs } from "./status-tabs";

export function ParkingApp() {
  const store = useParkingStore();
  const [activeStatus, setActiveStatus] = useState<ParkingItemStatus>("parked");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("ai_tool");
  const [planningFocusId, setPlanningFocusId] = useState<string | null>(null);
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
            {/* Mirrors the real lot so hydration reads as a fill, not a layout swap. */}
            <section
              aria-busy="true"
              aria-label="Loading parking data"
              className="overflow-hidden border-2 border-[var(--ink)] bg-white"
            >
              <div className="parking-surface min-h-[24rem] p-4 sm:p-6">
                <p className="m-0 text-sm font-bold text-white">Loading parking data…</p>
                <div className="parking-grid mt-4" aria-hidden="true">
                  <div className="empty-stall" />
                  <div className="empty-stall" />
                  <div className="empty-stall" />
                </div>
              </div>
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
      const nextStatus = destination[action.type] ?? activeStatus;
      setActiveStatus(nextStatus);
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
          {captureMode === "idea" ? (
            <IdeaCaptureForm onPark={store.addItem} onParked={() => setActiveStatus("parked")} />
          ) : (
            <LinkCaptureForm
              key={captureMode}
              kind={captureMode}
              onPark={store.addItem}
              onParked={() => setActiveStatus("parked")}
            />
          )}
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        {store.storageWarning ? (
          <p role="status" className="reveal mb-4 border-l-4 border-[var(--safety)] bg-white px-4 py-3 text-sm font-bold">
            {store.storageWarning}
          </p>
        ) : null}

        {store.needsReset ? (
          <div className="reveal mb-4 border-2 border-[var(--scrap)] bg-white px-4 py-4">
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
          onPlanTestDrive={(id) => {
            const item = store.items.find((candidate) => candidate.id === id);
            if (item) setActiveStatus(item.status);
            setPlanningFocusId(id);
            store.selectItem(id);
          }}
          onStartTestDrive={(id) => {
            const result = store.applyAction(id, { type: "start_test_drive" });
            if (result.ok) setActiveStatus("test_driving");
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
            activeStatus={activeStatus}
            onSelect={(id, trigger) => {
              itemTrigger.current = trigger;
              store.selectItem(id);
            }}
          />
        </section>
      </main>

      {/* Roadmap lives in one quiet line instead of two dead buttons on the main screen. */}
      <footer className="border-t border-black/10 px-5 py-4 sm:px-8">
        <p className="mx-auto max-w-7xl text-xs leading-5 text-[var(--muted-ink)]">
          Planned for later releases: parking any object type, and gathering people
          around parked tools, ideas, experiments, notes, and decisions.
        </p>
      </footer>

      <ItemInspector
        key={`${selectedItem?.id ?? "none"}:${planningFocusId ?? "review"}`}
        item={selectedItem}
        open={selectedItem !== null}
        autoFocusPlanning={selectedItem?.id === planningFocusId}
        onOpenChange={(open) => {
          if (!open) {
            store.selectItem(null);
            // The patrol prompt is handled once; reopening normally must not
            // keep stealing focus into the planning fields.
            setPlanningFocusId(null);
            requestAnimationFrame(() => itemTrigger.current?.focus());
          }
        }}
        onApplyAction={applySelectedAction}
        onUpdateEvidence={(notes, resultUrl) => {
          if (store.selectedId) {
            return store.updateEvidence(store.selectedId, notes, resultUrl);
          }
          return { ok: false, message: "This parking item could not be found." };
        }}
        onUpdateIdea={(input) =>
          store.selectedId
            ? store.updateIdea(store.selectedId, input)
            : { ok: false, message: "This parking item could not be found." }
        }
        onRepark={(kind, analysis, classification) =>
          store.selectedId
            ? store.reparkItem(store.selectedId, { kind, analysis, classification })
            : { ok: false, message: "This parking item could not be found." }
        }
      />
    </div>
  );
}
