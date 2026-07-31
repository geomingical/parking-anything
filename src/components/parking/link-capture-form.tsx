"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ActionResult } from "@/hooks/use-parking-store";
import { messageForFailedResponse, readJsonBody } from "@/lib/parking/analyze-url-client";
import { LINK_KINDS, type LinkKindId } from "@/lib/parking/link-kinds";
import { AnalyzeUrlResponseSchema, ParkingItemSchema, type ParkingItem } from "@/lib/parking/schemas";
import type { PendingAdvisory } from "./mispark-advisory";

type LinkCaptureFormProps = {
  kind: LinkKindId;
  onPark(item: ParkingItem): ActionResult;
  onParked?(): void;
  /**
   * Reported upward after a successful park whose classification disagrees
   * with the kind it was parked under. ParkingApp owns the advisory itself
   * (see mispark-advisory.tsx) so it survives a capture-mode switch — this
   * form no longer holds any advisory state of its own.
   */
  onMispark?(advisory: PendingAdvisory): void;
};

export function LinkCaptureForm({ kind, onPark, onParked, onMispark }: LinkCaptureFormProps) {
  const registry = LINK_KINDS[kind];
  const [url, setUrl] = useState("");
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
  const analyzeController = useRef<AbortController | null>(null);
  const operationLock = useRef(false);

  useEffect(
    () => () => {
      // Fix round 1, Finding 1: abort AND null out the controller on
      // unmount. Aborting alone cannot stop a response that has already won
      // the race past the network call, so any resumed async function must
      // see its own controller no longer matches the ref and bail before
      // touching the store or calling setState.
      analyzeController.current?.abort();
      analyzeController.current = null;
    },
    [],
  );

  async function analyzeAndPark() {
    // Defect B / Finding 2 fix: this must be a synchronous lock, not a
    // render snapshot. Two submits dispatched in the same commit both see
    // the same (stale) React state, but the ref is mutated immediately below
    // and is visible to the very next synchronous call.
    if (operationLock.current) return;

    let normalizedUrl: string;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      normalizedUrl = parsed.toString();
    } catch {
      setAnalysisError("Enter one valid public HTTP(S) URL.");
      return;
    }

    const controller = new AbortController();
    analyzeController.current = controller;
    operationLock.current = true;
    setAnalyzingUrl(normalizedUrl);
    setAnalysisError(null);
    setAnalysisWarning(null);

    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, kind }),
        signal: controller.signal,
      });
      const body = await readJsonBody(response);
      if (!response.ok) {
        throw new Error(
          messageForFailedResponse(response, body, "The analysis could not be completed."),
        );
      }

      const result = AnalyzeUrlResponseSchema.safeParse(body);
      if (!result.success) throw new Error("The analysis response could not be verified. Try again.");

      // Defect B / Finding 1 fix (continued): an abort alone cannot stop a
      // response that already won the race and is mid-flight past the
      // network call. The unmount cleanup nulls this ref, so this check is
      // genuinely reachable (not dead code) — it fires whenever the
      // component has unmounted since the request began.
      if (analyzeController.current !== controller) return;

      const now = new Date().toISOString();
      const item = ParkingItemSchema.parse({
        ...result.data.analysis,
        id: crypto.randomUUID(),
        url: normalizedUrl,
        kind,
        status: "parked",
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
      });
      const saved = onPark(item);
      if (!saved.ok) throw new Error(saved.message);
      setAnalysisWarning(result.data.warning ?? null);
      if (result.data.classification.suggestedKind !== kind) {
        onMispark?.({
          itemId: item.id,
          url: normalizedUrl,
          suggestedKind: result.data.classification.suggestedKind,
          rationale: result.data.classification.rationale,
        });
      }
      setUrl("");
      onParked?.();
    } catch (error) {
      if (controller.signal.aborted) return;
      setAnalysisError(error instanceof Error ? error.message : "The analysis could not be completed. Try again.");
    } finally {
      // Gated on ref identity, not unconditional: after unmount the ref is
      // already null (cleanup ran), so this deliberately skips releasing the
      // lock and skips setState on a dead instance — see Finding 1.
      if (analyzeController.current === controller) {
        analyzeController.current = null;
        operationLock.current = false;
        setAnalyzingUrl(null);
      }
    }
  }

  const busy = Boolean(analyzingUrl);

  return (
    <div className="mt-5">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void analyzeAndPark(); }}>
        <label htmlFor="link-url" className="sr-only">{registry.urlFieldLabel}</label>
        <input id="link-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder={registry.urlPlaceholder} disabled={busy} className="h-12 min-w-0 flex-1 border-2 border-[var(--ink)] bg-white px-4 text-base disabled:bg-black/5" />
        <button type="submit" disabled={busy} className="pressable inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-[var(--safety)] px-6 text-sm font-black uppercase tracking-[0.08em] disabled:cursor-wait disabled:opacity-50">{analyzingUrl ? <LoaderCircle aria-hidden="true" size={16} className="spinner" /> : null}Analyze &amp; Park</button>
      </form>
      {analyzingUrl ? <p className="reveal mt-2 text-sm font-bold" aria-live="polite">Analyzing {analyzingUrl}…</p> : null}
      {analysisError ? <p role="alert" className="reveal mt-3 border-l-4 border-[var(--scrap)] bg-white px-4 py-3 text-sm font-bold">{analysisError}</p> : null}
      {analysisWarning ? <p role="status" className="reveal mt-3 border-l-4 border-[var(--safety)] bg-white px-4 py-3 text-sm font-bold">{analysisWarning}</p> : null}
    </div>
  );
}
