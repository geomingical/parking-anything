"use client";

import { useRef } from "react";

import { LINK_KINDS, LINK_KIND_IDS, type LinkKindId } from "@/lib/parking/link-kinds";

export type CaptureMode = LinkKindId | "idea";

type CaptureSwitcherProps = {
  activeMode: CaptureMode;
  onChange(mode: CaptureMode): void;
};

const modes: Array<{ mode: CaptureMode; label: string }> = [
  ...LINK_KIND_IDS.map((id) => ({
    mode: id as CaptureMode,
    label: LINK_KINDS[id].captureLabel,
  })),
  { mode: "idea", label: "Park idea" },
];

export function CaptureSwitcher({ activeMode, onChange }: CaptureSwitcherProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div>
      <div
        aria-label="Choose what to park"
        className="flex flex-wrap gap-2"
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
    </div>
  );
}
