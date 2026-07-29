"use client";

import { useRef } from "react";

export type CaptureMode = "tool" | "idea";

type CaptureSwitcherProps = {
  activeMode: CaptureMode;
  onChange(mode: CaptureMode): void;
};

const modes: Array<{ mode: CaptureMode; label: string }> = [
  { mode: "tool", label: "Park tool" },
  { mode: "idea", label: "Park idea" },
];

export function CaptureSwitcher({ activeMode, onChange }: CaptureSwitcherProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div>
      <div
        aria-label="Choose what to park"
        className="grid grid-cols-2 gap-2 sm:flex"
        role="tablist"
      >
        {modes.map(({ mode, label }, index) => (
          <button
            key={mode}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={activeMode === mode}
            tabIndex={activeMode === mode ? 0 : -1}
            onClick={() => onChange(mode)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const nextIndex = (index + direction + modes.length) % modes.length;
              onChange(modes[nextIndex].mode);
              refs.current[nextIndex]?.focus();
            }}
            className={`pressable h-11 px-5 text-sm font-black ${
              activeMode === mode
                ? "bg-[var(--ink)] text-white"
                : "border-2 border-[var(--ink)] bg-white hover:bg-black/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled
        aria-describedby="park-whatever-description"
        className="mt-2 h-10 cursor-not-allowed border border-dashed border-black/25 bg-transparent px-4 text-sm font-bold text-black/40"
      >
        Park whatever · Future
      </button>
      <span id="park-whatever-description" className="sr-only">
        Additional parkable object types are planned for a future release.
      </span>
    </div>
  );
}
