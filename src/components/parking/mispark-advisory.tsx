"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ReparkFailureReason, ReparkResult } from "@/hooks/use-parking-store";
import { messageForFailedResponse, readJsonBody } from "@/lib/parking/analyze-url-client";
import { LINK_KINDS, type LinkKindId } from "@/lib/parking/link-kinds";
import { AnalyzeUrlResponseSchema, type AnalyzeUrlResult } from "@/lib/parking/schemas";

export type PendingAdvisory = {
  itemId: string;
  url: string;
  /**
   * The item's stored title, when available. Optional (rather than always
   * populated from the item) so a caller that only has a URL on hand can
   * still construct an advisory — `advisoryLabel` falls back to the URL's
   * hostname (Finding 2: two advisories with similar rationales were
   * otherwise indistinguishable, including in the re-park button's
   * accessible name).
   */
  title?: string;
  suggestedKind: LinkKindId;
  rationale: string;
};

/**
 * The identity shown on an advisory's card and folded into its re-park
 * button's accessible name (Finding 2). Prefers the item's stored title;
 * falls back to the URL's hostname so two advisories are always
 * distinguishable even without one.
 */
export function advisoryLabel(advisory: Pick<PendingAdvisory, "url" | "title">): string {
  if (advisory.title && advisory.title.trim()) return advisory.title;
  try {
    return new URL(advisory.url).hostname;
  } catch {
    return advisory.url;
  }
}

type MisparkAdvisoryProps = {
  advisory: PendingAdvisory;
  onRepark(id: string, kind: LinkKindId, analysis: AnalyzeUrlResult): ReparkResult;
  /**
   * Called after a successful re-park: `null` when the model now agrees with
   * the new kind, or an updated PendingAdvisory when it still disagrees.
   * `warning` is the URL-only warning (if any) from THIS re-park's response —
   * handed to the parent rather than rendered here, because the `null` case
   * unmounts this component in the same tick (ParkingApp drops the advisory
   * from its map), so anything queued into this component's own state would
   * never paint (Finding 3).
   */
  onReparked(next: PendingAdvisory | null, warning: string | null): void;
  /**
   * Called after ANY failed re-park (network/HTTP failure, or a successful
   * fetch whose store write was refused). The component itself never decides
   * whether to keep or drop the advisory — only the parent can. `reason` is
   * undefined for a network/HTTP-layer failure (always transient — retry may
   * succeed) and the store's own ReparkFailureReason for a refused write,
   * computed by the store from the LIVE item at write time rather than any
   * snapshot the caller might be holding (Finding 2).
   */
  onReparkFailed(
    pending: PendingAdvisory,
    reason: ReparkFailureReason | undefined,
    message: string,
  ): void;
  /**
   * Called when the user explicitly clears this advisory. An advisory used
   * to be removable only by a re-park result or a full reset, so the only
   * way to escape one you did not want was a button guaranteed to fail once
   * the item went terminal — this is an always-available way out (Finding 3).
   */
  onDismiss(itemId: string): void;
};

/**
 * Owns the re-park request for one mis-park advisory: its own AbortController
 * and its own synchronous re-entry lock, mirroring the hardening previously
 * built into LinkCaptureForm's repark() (ownership check before any state
 * write or callback, abort + null the controller on unmount).
 */
export function MisparkAdvisory({
  advisory,
  onRepark,
  onReparked,
  onReparkFailed,
  onDismiss,
}: MisparkAdvisoryProps) {
  const [reparking, setReparking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reparkController = useRef<AbortController | null>(null);
  const operationLock = useRef(false);

  useEffect(
    () => () => {
      reparkController.current?.abort();
      reparkController.current = null;
    },
    [],
  );

  async function repark() {
    if (operationLock.current) return;

    const controller = new AbortController();
    reparkController.current = controller;
    operationLock.current = true;
    setReparking(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: advisory.url, kind: advisory.suggestedKind }),
        signal: controller.signal,
      });
      const body = await readJsonBody(response);
      if (!response.ok) {
        throw new Error(
          messageForFailedResponse(response, body, "The re-park could not be completed."),
        );
      }
      const parsed = AnalyzeUrlResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("The re-park response could not be verified.");

      // Ownership check before any state write or callback: a response that
      // arrives after unmount must not touch the store or call back into a
      // dead parent.
      if (reparkController.current !== controller) return;

      const saved = onRepark(advisory.itemId, advisory.suggestedKind, parsed.data.analysis);
      if (!saved.ok) {
        // Refused by the store, not a network/HTTP failure — saved.reason
        // came from the live item at write time, so the parent can decide
        // keep-vs-drop without ever looking at its own (possibly stale)
        // items snapshot.
        setError(saved.message);
        onReparkFailed(advisory, saved.reason, saved.message);
        return;
      }

      // Warning is handed to the parent, not rendered here: when the new
      // classification agrees, onReparked(null, …) causes ParkingApp to drop
      // this advisory in the same tick, unmounting this component before any
      // locally-queued state could ever paint.
      onReparked(
        parsed.data.classification.suggestedKind === advisory.suggestedKind
          ? null
          : {
              ...advisory,
              suggestedKind: parsed.data.classification.suggestedKind,
              rationale: parsed.data.classification.rationale,
            },
        parsed.data.warning ?? null,
      );
    } catch (caught) {
      if (controller.signal.aborted) return;
      if (reparkController.current !== controller) return;
      const message =
        caught instanceof Error ? caught.message : "The re-park could not be completed.";
      setError(message);
      onReparkFailed(advisory, undefined, message);
    } finally {
      if (reparkController.current === controller) {
        reparkController.current = null;
        operationLock.current = false;
        setReparking(false);
      }
    }
  }

  const label = advisoryLabel(advisory);

  return (
    <>
      <div role="status" className="reveal mt-3 border-l-4 border-[var(--garage)] bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-ink)]">{label}</p>
          <button
            type="button"
            onClick={() => onDismiss(advisory.itemId)}
            aria-label={`Dismiss ${label} advisory`}
            className="pressable inline-flex size-7 shrink-0 items-center justify-center border border-black/20 bg-white hover:bg-black hover:text-white"
          >
            <X aria-hidden="true" size={14} />
          </button>
        </div>
        <p className="mt-1 text-sm font-bold">
          This looks more like a {LINK_KINDS[advisory.suggestedKind].noun}.
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">{advisory.rationale}</p>
        <button
          type="button"
          disabled={reparking}
          onClick={() => void repark()}
          className="pressable mt-3 h-10 bg-[var(--garage)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
        >
          {reparking ? "Re-parking…" : `Re-park ${label} as ${LINK_KINDS[advisory.suggestedKind].label}`}
        </button>
      </div>
      {error ? (
        <p role="alert" className="reveal mt-3 border-l-4 border-[var(--scrap)] bg-white px-4 py-3 text-sm font-bold">
          {error}
        </p>
      ) : null}
    </>
  );
}
