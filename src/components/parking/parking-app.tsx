"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useParkingStore } from "@/hooks/use-parking-store";
import {
  AnalyzeUrlResponseSchema,
  ParkingItemSchema,
  type ParkingItem,
  type ParkingItemStatus,
} from "@/lib/parking/schemas";
import type { ParkingAction } from "@/lib/parking/transitions";
import { ItemInspector } from "./item-inspector";
import { ManagerPatrol } from "./manager-patrol";
import { MissionHeader } from "./mission-header";
import { ParkingLot } from "./parking-lot";
import { StatusTabs } from "./status-tabs";

export function ParkingApp() {
  const store = useParkingStore();
  const [activeStatus, setActiveStatus] = useState<ParkingItemStatus>("parked");
  const [url, setUrl] = useState("");
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
  const analyzeController = useRef<AbortController | null>(null);
  const itemTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => analyzeController.current?.abort(), []);

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

  async function analyzeAndPark() {
    if (analyzingUrl) return;

    let normalizedUrl: string;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
      normalizedUrl = parsed.toString();
    } catch {
      setAnalysisError("Enter one valid public HTTP(S) URL.");
      return;
    }

    const controller = new AbortController();
    analyzeController.current = controller;
    setAnalyzingUrl(normalizedUrl);
    setAnalysisError(null);
    setAnalysisWarning(null);

    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
        signal: controller.signal,
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const serverError =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "The analysis could not be completed.";
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          throw new Error(
            retryAfter
              ? `${serverError} Try again in ${retryAfter} seconds.`
              : `${serverError} Try again shortly.`,
          );
        }
        if (response.status === 503) {
          throw new Error(`${serverError} Try again shortly.`);
        }
        throw new Error(serverError);
      }

      const result = AnalyzeUrlResponseSchema.safeParse(body);
      if (!result.success) {
        throw new Error("The analysis response could not be verified. Try again.");
      }

      const now = new Date().toISOString();
      const item: ParkingItem = ParkingItemSchema.parse({
        ...result.data.analysis,
        id: crypto.randomUUID(),
        url: normalizedUrl,
        category: "ai_tool",
        status: "parked",
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
      });
      store.addItem(item);
      setActiveStatus("parked");
      setAnalysisWarning(result.data.warning ?? null);
      setUrl("");
    } catch (error) {
      if (controller.signal.aborted) return;
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "The analysis could not be completed. Try again.",
      );
    } finally {
      if (analyzeController.current === controller) {
        analyzeController.current = null;
        setAnalyzingUrl(null);
      }
    }
  }

  if (!store.isHydrated) {
    return (
      <div className="min-h-screen bg-[var(--paper)]">
        <MissionHeader analyzeDisabled />
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
        url={url}
        onUrlChange={setUrl}
        onAnalyze={analyzeAndPark}
        onReset={() => {
          store.resetDemo();
          setActiveStatus("parked");
          setAnalysisError(null);
          setAnalysisWarning(null);
        }}
        analyzingUrl={analyzingUrl}
      />
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

        {analysisError ? (
          <p
            role="alert"
            className="mb-4 border-l-4 border-[var(--scrap)] bg-white px-4 py-3 text-sm font-bold"
          >
            {analysisError}
          </p>
        ) : null}

        {analysisWarning ? (
          <p
            role="status"
            className="mb-4 border-l-4 border-[var(--safety)] bg-white px-4 py-3 text-sm font-bold"
          >
            {analysisWarning}
          </p>
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
        onUpdateEvidence={(notes, repoUrl) => {
          if (store.selectedId) {
            store.updateEvidence(store.selectedId, notes, repoUrl);
          }
        }}
      />
    </div>
  );
}
