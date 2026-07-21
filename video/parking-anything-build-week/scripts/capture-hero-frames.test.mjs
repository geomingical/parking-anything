import { describe, expect, it } from "vitest";

import {
  CANONICAL_FRAME_NAMES,
  MAIN_SAMPLE_TIMES,
  assertDisclosureMeasurement,
  isKnownGeneratedArtifact,
} from "./capture-hero-frames-contract.mjs";

describe("canonical hero-frame artifacts", () => {
  it("locks the exact ordered Build Week sample manifest", () => {
    expect(MAIN_SAMPLE_TIMES).toEqual([4, 23, 39, 53, 64, 80, 98, 110, 118, 128, 138, 142, 147, 149.4]);
    expect(CANONICAL_FRAME_NAMES).toEqual([
      "frame-00-at-4s.png",
      "frame-01-at-23s.png",
      "frame-02-at-39s.png",
      "frame-03-at-53s.png",
      "frame-04-at-64s.png",
      "frame-05-at-80s.png",
      "frame-06-at-98s.png",
      "frame-07-at-110s.png",
      "frame-08-at-118s.png",
      "frame-09-at-128s.png",
      "frame-10-at-138s.png",
      "frame-11-at-142s.png",
      "frame-12-at-147s.png",
      "frame-13-at-149.4s.png",
    ]);
  });

  it("only identifies known main-generator artifacts for cleanup", () => {
    for (const artifact of [
      "frame-10-at-138s.png",
      "frame-99-at-999s.png",
      "parking-anything-main-138.0s.png",
      "contact-sheet.jpg",
      "contact-sheet-2.jpg",
    ]) {
      expect(isKnownGeneratedArtifact(artifact), artifact).toBe(true);
    }

    for (const protectedOrUnknown of [
      "README.md",
      "future-proof.png",
      "parking-anything-teaser-11.0s.png",
      "../parking-anything-teaser/snapshots/frame-00-at-1.5s.png",
    ]) {
      expect(isKnownGeneratedArtifact(protectedOrUnknown), protectedOrUnknown).toBe(false);
    }
  });

  it("rejects a yellow disclosure box whose rendered text is empty or clipped", () => {
    expect(() => assertDisclosureMeasurement({
      yellowCount: 14_790,
      yellowWidth: 356,
      yellowHeight: 48,
      darkCount: 1_297,
      darkWidth: 312,
      darkHeight: 15,
    })).not.toThrow();

    expect(() => assertDisclosureMeasurement({
      yellowCount: 14_790,
      yellowWidth: 356,
      yellowHeight: 48,
      darkCount: 71,
      darkWidth: 12,
      darkHeight: 15,
    })).toThrow(/rendered text pixels collapsed/);
  });
});
