"use client";

import { Settings } from "lucide-react";

type MissionHeaderProps = {
  disabled?: boolean;
};

export function MissionHeader({ disabled = false }: MissionHeaderProps) {
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

        <button
          type="button"
          title="Reset demo data"
          aria-label="Reset demo data"
          disabled={disabled}
          className="inline-flex size-11 shrink-0 items-center justify-center border border-black/20 bg-white transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Settings aria-hidden="true" size={18} />
        </button>
      </div>

      <form
        className="mx-auto mt-6 flex max-w-7xl flex-col gap-2 sm:flex-row"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor="ai-tool-url" className="sr-only">
          AI tool URL
        </label>
        <input
          id="ai-tool-url"
          type="url"
          placeholder="https://example.com/ai-tool"
          disabled={disabled}
          className="h-12 min-w-0 flex-1 border-2 border-[var(--ink)] bg-white px-4 text-base placeholder:text-black/40 disabled:cursor-not-allowed disabled:bg-black/5"
        />
        <button
          type="submit"
          disabled={disabled}
          className="h-12 shrink-0 bg-[var(--safety)] px-6 text-sm font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyze &amp; Park
        </button>
      </form>
    </header>
  );
}
