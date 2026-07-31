"use client";

import { useMemo, useRef, useState } from "react";

import { useParkingStore, type ReparkFailureReason } from "@/hooks/use-parking-store";
import type { ParkingItemStatus } from "@/lib/parking/schemas";
import type { ParkingAction } from "@/lib/parking/transitions";
import { CaptureSwitcher, type CaptureMode } from "./capture-switcher";
import { IdeaCaptureForm } from "./idea-capture-form";
import { ItemInspector } from "./item-inspector";
import { LinkCaptureForm } from "./link-capture-form";
import { ManagerPatrol } from "./manager-patrol";
import { MisparkAdvisory, type PendingAdvisory } from "./mispark-advisory";
import { MissionHeader } from "./mission-header";
import { ParkingLot } from "./parking-lot";
import { StatusTabs } from "./status-tabs";

export function ParkingApp() {
  const store = useParkingStore();
  const [activeStatus, setActiveStatus] = useState<ParkingItemStatus>("parked");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("ai_tool");
  const [planningFocusId, setPlanningFocusId] = useState<string | null>(null);
  // Owned here (not by LinkCaptureForm) so it survives a capture-mode switch
  // and a park of something else — it is the only affordance anywhere in the
  // app that can change an item's kind, so ordinary navigation must not
  // silently discard it. See mispark-advisory.tsx.
  //
  // Keyed by itemId (not a single slot): a competing park that also
  // mis-parks must not evict an advisory whose own re-park is in flight — a
  // single slot meant `setAdvisory` silently replaced it, unmounting its
  // MisparkAdvisory (via `key={advisory.itemId}` below) and aborting its
  // request out from under the user (Finding 1).
  const [advisories, setAdvisories] = useState<Map<string, PendingAdvisory>>(
    () => new Map(),
  );
  const [advisoryNotice, setAdvisoryNotice] = useState<string | null>(null);
  // A URL-only re-park warning, lifted out of MisparkAdvisory: when the new
  // classification agrees, the advisory is removed (and that component
  // unmounts) in the same tick it would have queued this locally — anything
  // stored inside that dying component would never paint (Finding 3).
  const [reparkWarning, setReparkWarning] = useState<string | null>(null);
  const itemTrigger = useRef<HTMLButtonElement | null>(null);

  function upsertAdvisory(next: PendingAdvisory) {
    setAdvisories((prev) => {
      const updated = new Map(prev);
      updated.set(next.itemId, next);
      return updated;
    });
  }

  function removeAdvisory(itemId: string) {
    setAdvisories((prev) => {
      if (!prev.has(itemId)) return prev;
      const updated = new Map(prev);
      updated.delete(itemId);
      return updated;
    });
  }

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
          // Reset replaces every item wholesale, so any pending advisory (and
          // any in-flight re-park behind it) targets an item id that no
          // longer exists in the fresh demo data. Clearing the map unmounts
          // each MisparkAdvisory, which aborts its own request via its
          // unmount effect — the stale-target problem is avoided by never
          // letting a response for a pre-reset item resolve into a decision
          // at all (Finding 2), rather than trying to classify it after the
          // fact.
          setAdvisories(new Map());
          setAdvisoryNotice(null);
          setReparkWarning(null);
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
              onMispark={(next) => {
                upsertAdvisory(next);
                setAdvisoryNotice(null);
              }}
            />
          )}
          {/* Deliberately rendered OUTSIDE the keyed LinkCaptureForm above so
              switching capture mode (which remounts that form) cannot
              destroy this. One MisparkAdvisory per pending item, each still
              keyed by its own itemId so ITS OWN abort/lock/ownership
              behaviour is unaffected by any other advisory's lifecycle —
              only that item's own successful (or permanently-failed) re-park
              removes it from the map (Finding 1). */}
          {Array.from(advisories.values()).map((advisory) => (
            <MisparkAdvisory
              key={advisory.itemId}
              advisory={advisory}
              onRepark={(id, kind, analysis) => store.reparkItem(id, { kind, analysis })}
              onReparked={(next, warning) => {
                if (next) {
                  upsertAdvisory(next);
                } else {
                  removeAdvisory(advisory.itemId);
                }
                setReparkWarning(warning);
              }}
              onReparkFailed={(
                pending,
                reason: ReparkFailureReason | undefined,
                message,
              ) => {
                // The store computed `reason` from the LIVE item at write
                // time — not from anything captured here — so this decision
                // cannot go stale even if this item changed status (e.g. was
                // towed) after the re-park request was sent (Finding 2).
                const permanent = reason === "not_found" || reason === "terminal";
                if (!permanent) return;
                // A permanent failure can never succeed on retry, unlike a
                // transient 429/network blip or a "blocked" write (e.g. an
                // unconfirmed reset) — drop the advisory but say why instead
                // of letting it vanish silently.
                removeAdvisory(pending.itemId);
                setAdvisoryNotice(message);
              }}
            />
          ))}
          {reparkWarning ? (
            <p role="status" className="reveal mt-3 border-l-4 border-[var(--safety)] bg-white px-4 py-3 text-sm font-bold">
              {reparkWarning}
            </p>
          ) : null}
          {advisoryNotice ? (
            <p role="status" className="reveal mt-3 border-l-4 border-[var(--scrap)] bg-white px-4 py-3 text-sm font-bold">
              {advisoryNotice}
            </p>
          ) : null}
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
      />
    </div>
  );
}
