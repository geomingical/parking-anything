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
  requestedKind: LinkKindId;
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

export function LinkCaptureForm({ kind, onPark, onRepark, onParked }: LinkCaptureFormProps) {
  const registry = LINK_KINDS[kind];
  const [url, setUrl] = useState("");
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<PendingAdvisory | null>(null);
  const [reparking, setReparking] = useState(false);
  const analyzeController = useRef<AbortController | null>(null);

  useEffect(() => () => analyzeController.current?.abort(), []);

  async function analyzeAndPark() {
    // Defect B fix: this must be a synchronous lock, not a state read. Two
    // submits dispatched in the same commit both see the same (stale) React
    // state, but the ref is mutated immediately below and is visible to the
    // very next synchronous call.
    if (analyzeController.current) return;

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
        const serverError = extractServerError(body) ?? "The analysis could not be completed.";
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          throw new Error(retryAfter ? `${serverError} Try again in ${retryAfter} seconds.` : `${serverError} Try again shortly.`);
        }
        if (response.status === 503) throw new Error(`${serverError} Try again shortly.`);
        throw new Error(serverError);
      }

      const result = AnalyzeUrlResponseSchema.safeParse(body);
      if (!result.success) throw new Error("The analysis response could not be verified. Try again.");

      // Defect B fix (continued): an abort alone cannot stop a response that
      // already won the race and is mid-flight past the network call. Refuse
      // to persist if a newer request has since taken the lock.
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
          requestedKind: kind,
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
      if (analyzeController.current === controller) {
        analyzeController.current = null;
        setAnalyzingUrl(null);
      }
    }
  }

  async function repark(pending: PendingAdvisory) {
    if (reparking) return;
    setReparking(true);
    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pending.url, kind: pending.suggestedKind }),
      });
      const body = await readJsonBody(response);
      if (!response.ok) {
        const serverError = extractServerError(body) ?? "The re-park could not be completed.";
        throw new Error(serverError);
      }
      const parsed = AnalyzeUrlResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("The re-park response could not be verified.");

      const saved = onRepark(pending.itemId, pending.suggestedKind, parsed.data.analysis);
      if (!saved.ok) throw new Error(saved.message);
      setAdvisory(
        parsed.data.classification.suggestedKind === pending.suggestedKind
          ? null
          : {
              ...pending,
              requestedKind: pending.suggestedKind,
              suggestedKind: parsed.data.classification.suggestedKind,
              rationale: parsed.data.classification.rationale,
            },
      );
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "The re-park could not be completed.",
      );
      setAdvisory(null);
    } finally {
      setReparking(false);
    }
  }

  return (
    <div className="mt-5">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void analyzeAndPark(); }}>
        <label htmlFor="link-url" className="sr-only">{registry.urlFieldLabel}</label>
        <input id="link-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder={registry.urlPlaceholder} disabled={Boolean(analyzingUrl)} className="h-12 min-w-0 flex-1 border-2 border-[var(--ink)] bg-white px-4 text-base disabled:bg-black/5" />
        <button type="submit" disabled={Boolean(analyzingUrl)} className="pressable inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-[var(--safety)] px-6 text-sm font-black uppercase tracking-[0.08em] disabled:cursor-wait disabled:opacity-50">{analyzingUrl ? <LoaderCircle aria-hidden="true" size={16} className="spinner" /> : null}Analyze &amp; Park</button>
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
