"use client";

import { useEffect, useRef, useState } from "react";

import type { ReparkFailureReason, ReparkResult } from "@/hooks/use-parking-store";
import { messageForFailedResponse, readJsonBody } from "@/lib/parking/analyze-url-client";
import { LINK_KINDS, type LinkKindId } from "@/lib/parking/link-kinds";
import { AnalyzeUrlResponseSchema, type AnalyzeUrlResult } from "@/lib/parking/schemas";

export type PendingAdvisory = {
  itemId: string;
  url: string;
  suggestedKind: LinkKindId;
  rationale: string;
};

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

  return (
    <>
      <div role="status" className="reveal mt-3 border-l-4 border-[var(--garage)] bg-white px-4 py-3">
        <p className="text-sm font-bold">
          This looks more like a {LINK_KINDS[advisory.suggestedKind].noun}.
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">{advisory.rationale}</p>
        <button
          type="button"
          disabled={reparking}
          onClick={() => void repark()}
          className="pressable mt-3 h-10 bg-[var(--garage)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
        >
          {reparking ? "Re-parking…" : `Re-park as ${LINK_KINDS[advisory.suggestedKind].label}`}
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
