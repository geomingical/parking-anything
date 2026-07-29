"use client";

import { Settings } from "lucide-react";
import { useState } from "react";

type MissionHeaderProps = {
  onReset?(): void;
};

export function MissionHeader({
  onReset,
}: MissionHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="border-b border-black/10 bg-[var(--paper)] px-5 py-6 sm:px-8">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--garage)]">
            Unified Parking Lot 01
          </p>
          <h1 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
            Parking Anything
          </h1>
          <p className="mt-3 text-xl font-bold sm:text-2xl">
            Stop collecting. Start test-driving.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)] sm:text-base">
            Turn saved tools and ideas into concrete trials, evidenced adoption, or a
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
            className="pressable inline-flex size-11 items-center justify-center border border-black/20 bg-white hover:bg-black hover:text-white"
          >
            <Settings aria-hidden="true" size={18} />
          </button>
          {showSettings ? (
            <div className="popover-enter absolute right-0 top-13 z-30 w-72 border-2 border-[var(--ink)] bg-white p-4 shadow-[var(--lift-2)]">
              <p className="font-black">Reset demo data?</p>
              <p className="mt-1 text-sm leading-5 text-[var(--muted-ink)]">
                Replace local changes with the exact three seed cars.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="pressable h-10 border-2 border-[var(--ink)] px-3 text-sm font-bold hover:bg-black hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReset?.();
                    setShowSettings(false);
                  }}
                  className="pressable h-10 bg-[var(--scrap)] px-3 text-sm font-black text-white hover:bg-black"
                >
                  Reset demo data
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
