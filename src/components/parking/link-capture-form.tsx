"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ActionResult } from "@/hooks/use-parking-store";
import { LINK_KINDS, type LinkKindId } from "@/lib/parking/link-kinds";
import {
  AnalyzeUrlResponseSchema,
  ParkingItemSchema,
  type AnalyzeUrlResult,
  type ParkingItem,
} from "@/lib/parking/schemas";

type PendingAdvisory = {
  itemId: string;
  url: string;
  suggestedKind: LinkKindId;
  rationale: string;
};

type LinkCaptureFormProps = {
  kind: LinkKindId;
  onPark(item: ParkingItem): ActionResult;
  onRepark(id: string, kind: LinkKindId, analysis: AnalyzeUrlResult): ActionResult;
  onParked?(): void;
};

/**
 * Reads a fetch Response body as JSON without ever throwing. An error
 * response (502/503, a proxy's HTML page, an empty body) must surface the
 * generic message below, not a raw JSON parse error.
 */
async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractServerError(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return null;
}

/**
 * Finding 2 fix: analyzeAndPark and repark hit the same endpoint and must
 * present the same guidance for the same failure — retry-after wording for a
 * 429 quota rejection, "try again shortly" for a 503 outage. Both callers
 * route through this one helper so the wording can never drift between them.
 */
function messageForFailedResponse(
  response: Response,
  body: unknown,
  fallbackMessage: string,
): string {
  const serverError = extractServerError(body) ?? fallbackMessage;
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return retryAfter
      ? `${serverError} Try again in ${retryAfter} seconds.`
      : `${serverError} Try again shortly.`;
  }
  if (response.status === 503) return `${serverError} Try again shortly.`;
  return serverError;
}

export function LinkCaptureForm({ kind, onPark, onRepark, onParked }: LinkCaptureFormProps) {
  const registry = LINK_KINDS[kind];
  const [url, setUrl] = useState("");
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<PendingAdvisory | null>(null);
  const [reparking, setReparking] = useState(false);
  const analyzeController = useRef<AbortController | null>(null);
  const reparkController = useRef<AbortController | null>(null);
  // Fix round 1, Finding 2: park and re-park share ONE synchronous lock so
  // they can never run concurrently and clobber each other's state.
  const operationLock = useRef(false);

  useEffect(
    () => () => {
      // Fix round 1, Finding 1: abort AND null out both controllers on
      // unmount. Aborting alone cannot stop a response that has already won
      // the race past the network call, so any resumed async function must
      // see its own controller no longer matches the ref and bail before
      // touching the store or calling setState.
      analyzeController.current?.abort();
      analyzeController.current = null;
      reparkController.current?.abort();
      reparkController.current = null;
    },
    [],
  );

  async function analyzeAndPark() {
    // Defect B / Finding 2 fix: this must be a synchronous lock, not a
    // render snapshot. Two submits dispatched in the same commit both see
    // the same (stale) React state, but the ref is mutated immediately below
    // and is visible to the very next synchronous call — and it is shared
    // with repark() so a park can never start while a re-park is in flight
    // (or vice versa).
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
    setAdvisory(null);

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
        setAdvisory({
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

  async function repark(pending: PendingAdvisory) {
    // Finding 3 fix: same synchronous-lock treatment as analyzeAndPark — the
    // previous `if (reparking) return` was a render-snapshot state read that
    // let two same-commit clicks both start a request. Finding 2 fix: this
    // shares operationLock with analyzeAndPark, so a park can never start
    // while a re-park is in flight, and vice versa.
    if (operationLock.current) return;

    const controller = new AbortController();
    reparkController.current = controller;
    operationLock.current = true;
    setReparking(true);
    setAnalysisError(null);
    // Finding 4 fix: clear any warning left over from the FIRST analysis as
    // soon as a re-park starts — it describes the old analysis, not this one.
    setAnalysisWarning(null);
    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pending.url, kind: pending.suggestedKind }),
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

      // Finding 1 fix: ownership check before mutating the store, genuinely
      // reachable because unmount cleanup nulls this ref (see above).
      if (reparkController.current !== controller) return;

      const saved = onRepark(pending.itemId, pending.suggestedKind, parsed.data.analysis);
      if (!saved.ok) throw new Error(saved.message);
      // Finding 4 fix (continued): the warning now describes THIS response,
      // not the one that produced the advisory being acted on.
      setAnalysisWarning(parsed.data.warning ?? null);
      setAdvisory(
        parsed.data.classification.suggestedKind === pending.suggestedKind
          ? null
          : {
              ...pending,
              suggestedKind: parsed.data.classification.suggestedKind,
              rationale: parsed.data.classification.rationale,
            },
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setAnalysisError(
        error instanceof Error ? error.message : "The re-park could not be completed.",
      );
      // Finding 1 fix: do NOT clear the advisory here. It is the only
      // affordance that can change an item's kind, so clearing it on a
      // transient failure (429 quota gate, a needsReset store refusal, etc.)
      // would strand the item under the wrong kind with no way to recover
      // short of towing it to the Scrapyard and re-parking the URL. Leave it
      // set so the "Re-park as …" button stays clickable for a retry.
    } finally {
      if (reparkController.current === controller) {
        reparkController.current = null;
        operationLock.current = false;
        setReparking(false);
      }
    }
  }

  // Finding 2 fix: the URL input and submit must be disabled whenever EITHER
  // flow is active, not just the park flow — otherwise a park can be started
  // while a re-park is in flight.
  const busy = Boolean(analyzingUrl) || reparking;

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
      {advisory ? (
        <div role="status" className="reveal mt-3 border-l-4 border-[var(--garage)] bg-white px-4 py-3">
          <p className="text-sm font-bold">
            This looks more like a {LINK_KINDS[advisory.suggestedKind].noun}.
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">{advisory.rationale}</p>
          <button
            type="button"
            disabled={reparking}
            onClick={() => void repark(advisory)}
            className="pressable mt-3 h-10 bg-[var(--garage)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          >
            {reparking ? "Re-parking…" : `Re-park as ${LINK_KINDS[advisory.suggestedKind].label}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
