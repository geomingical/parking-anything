"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ActionResult } from "@/hooks/use-parking-store";
import {
  AnalyzeUrlResponseSchema,
  ParkingItemSchema,
  type ParkingItem,
} from "@/lib/parking/schemas";

type ToolCaptureFormProps = {
  onPark(item: ParkingItem): ActionResult;
  onParked?(): void;
};

export function ToolCaptureForm({ onPark, onParked }: ToolCaptureFormProps) {
  const [url, setUrl] = useState("");
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
  const analyzeController = useRef<AbortController | null>(null);

  useEffect(() => () => analyzeController.current?.abort(), []);

  async function analyzeAndPark() {
    if (analyzingUrl) return;
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

    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const serverError = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "The analysis could not be completed.";
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          throw new Error(retryAfter ? `${serverError} Try again in ${retryAfter} seconds.` : `${serverError} Try again shortly.`);
        }
        if (response.status === 503) throw new Error(`${serverError} Try again shortly.`);
        throw new Error(serverError);
      }

      const result = AnalyzeUrlResponseSchema.safeParse(body);
      if (!result.success) throw new Error("The analysis response could not be verified. Try again.");
      const now = new Date().toISOString();
      const item = ParkingItemSchema.parse({
        ...result.data.analysis,
        id: crypto.randomUUID(),
        url: normalizedUrl,
        kind: "ai_tool",
        status: "parked",
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
      });
      const saved = onPark(item);
      if (!saved.ok) throw new Error(saved.message);
      setAnalysisWarning(result.data.warning ?? null);
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

  return (
    <div className="mt-5">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void analyzeAndPark(); }}>
        <label htmlFor="ai-tool-url" className="sr-only">AI tool URL</label>
        <input id="ai-tool-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/ai-tool" disabled={Boolean(analyzingUrl)} className="h-12 min-w-0 flex-1 border-2 border-[var(--ink)] bg-white px-4 text-base disabled:bg-black/5" />
        <button type="submit" disabled={Boolean(analyzingUrl)} className="pressable inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-[var(--safety)] px-6 text-sm font-black uppercase tracking-[0.08em] disabled:cursor-wait disabled:opacity-50">{analyzingUrl ? <LoaderCircle aria-hidden="true" size={16} className="spinner" /> : null}Analyze &amp; Park</button>
      </form>
      {analyzingUrl ? <p className="reveal mt-2 text-sm font-bold" aria-live="polite">Analyzing {analyzingUrl}…</p> : null}
      {analysisError ? <p role="alert" className="reveal mt-3 border-l-4 border-[var(--scrap)] bg-white px-4 py-3 text-sm font-bold">{analysisError}</p> : null}
      {analysisWarning ? <p role="status" className="reveal mt-3 border-l-4 border-[var(--safety)] bg-white px-4 py-3 text-sm font-bold">{analysisWarning}</p> : null}
    </div>
  );
}
