"use client";

import { Settings } from "lucide-react";
import { useState } from "react";

type MissionHeaderProps = {
  url?: string;
  onUrlChange?(url: string): void;
  onAnalyze?(): void;
  onReset?(): void;
  analyzeDisabled?: boolean;
  analyzingUrl?: string | null;
};

export function MissionHeader({
  url = "",
  onUrlChange,
  onAnalyze,
  onReset,
  analyzeDisabled = false,
  analyzingUrl = null,
}: MissionHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="border-b border-black/10 bg-[var(--paper)] px-5 py-6 sm:px-8">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--garage)]">
            AI Tools · Municipal Lot 01
          </p>
          <h1 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
            Parking Anything
          </h1>
          <p className="mt-3 text-xl font-bold sm:text-2xl">
            Stop collecting. Start test-driving.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)] sm:text-base">
            Turn every saved AI tool into a concrete trial, an evidenced adoption, or a
            deliberate exit.
          </p>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            title="Reset demo data"
            aria-label="Reset demo data settings"
            aria-expanded={showSettings}
            onClick={() => setShowSettings((visible) => !visible)}
            className="inline-flex size-11 items-center justify-center border border-black/20 bg-white transition-colors hover:bg-black hover:text-white"
          >
            <Settings aria-hidden="true" size={18} />
          </button>
          {showSettings ? (
            <div className="absolute right-0 top-13 z-30 w-72 border-2 border-[var(--ink)] bg-white p-4 shadow-[8px_8px_0_rgba(0,0,0,0.14)]">
              <p className="font-black">Reset demo data?</p>
              <p className="mt-1 text-sm leading-5 text-[var(--muted-ink)]">
                Replace local changes with the exact three seed cars.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="h-10 border-2 border-[var(--ink)] px-3 text-sm font-bold hover:bg-black hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReset?.();
                    setShowSettings(false);
                  }}
                  className="h-10 bg-[var(--scrap)] px-3 text-sm font-black text-white hover:bg-black"
                >
                  Reset demo data
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form
        className="mx-auto mt-6 flex max-w-7xl flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          onAnalyze?.();
        }}
      >
        <label htmlFor="ai-tool-url" className="sr-only">
          AI tool URL
        </label>
        <input
          id="ai-tool-url"
          type="url"
          value={url}
          onChange={(event) => onUrlChange?.(event.target.value)}
          placeholder="https://example.com/ai-tool"
          disabled={analyzeDisabled || Boolean(analyzingUrl)}
          className="h-12 min-w-0 flex-1 border-2 border-[var(--ink)] bg-white px-4 text-base placeholder:text-black/40 disabled:cursor-not-allowed disabled:bg-black/5"
        />
        <button
          type="submit"
          disabled={analyzeDisabled || Boolean(analyzingUrl)}
          className="h-12 shrink-0 bg-[var(--safety)] px-6 text-sm font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyze &amp; Park
        </button>
      </form>
      {analyzingUrl ? (
        <p className="mx-auto mt-2 max-w-7xl text-sm font-bold" aria-live="polite">
          Analyzing {analyzingUrl}…
        </p>
      ) : null}
    </header>
  );
}
