import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "./fixtures";
import type { ParkingItem } from "./schemas";
import { V1_STORAGE_KEY } from "./storage-v1";
import {
  STORAGE_KEY,
  loadParkingStore,
  resetParkingStore,
  saveParkingStore,
} from "./storage";

const customItem: ParkingItem = {
  ...makeSeedItems()[0],
  id: "custom-item",
  title: "Custom Tool",
};

const validV1Envelope = {
  version: 1 as const,
  items: [
    {
      id: "legacy-tool",
      url: "https://example.com/legacy",
      category: "ai_tool" as const,
      status: "garaged" as const,
      title: "Legacy Tool",
      summary: "A strict v1 record.",
      effortTier: "focused_session" as const,
      suggestedTestTask: "Run the legacy test.",
      usefulnessHypothesis: "Useful if exact migration succeeds.",
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
      lastActivityAt: "2026-07-19T00:00:00.000Z",
      testStartedAt: "2026-07-18T01:00:00.000Z",
      notes: "Verified.",
      repoUrl: "https://github.com/example/result",
    },
  ],
};

function readV2() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!);
}

describe("authoritative v2 parking storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initializes exact v2 seed data on first load with one write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(loadParkingStore()).toEqual({
      kind: "initialized",
      items: makeSeedItems(),
    });
    expect(readV2()).toEqual({ version: 2, parkingItems: makeSeedItems() });
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("does not merge seeds into valid existing v2 data", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, parkingItems: [customItem] }),
    );

    expect(loadParkingStore()).toEqual({ kind: "ok", items: [customItem] });
  });

  it("does not read v1 when a malformed v2 key is present", () => {
    localStorage.setItem(STORAGE_KEY, "malformed");
    localStorage.setItem(V1_STORAGE_KEY, JSON.stringify(validV1Envelope));
    const getItem = vi.spyOn(Storage.prototype, "getItem");

    expect(loadParkingStore()).toEqual({
      kind: "needs_reset",
      reason: "malformed",
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("malformed");
    expect(getItem).not.toHaveBeenCalledWith(V1_STORAGE_KEY);
  });

  it("does not fall back to v1 when the present v2 version is wrong", () => {
    const wrongVersion = JSON.stringify({ version: 3, parkingItems: [] });
    localStorage.setItem(STORAGE_KEY, wrongVersion);
    localStorage.setItem(V1_STORAGE_KEY, JSON.stringify(validV1Envelope));

    expect(loadParkingStore()).toEqual({
      kind: "needs_reset",
      reason: "wrong_version",
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(wrongVersion);
  });

  it("converts strict v1 items exactly once when v2 is absent", () => {
    const v1Bytes = JSON.stringify(validV1Envelope);
    localStorage.setItem(V1_STORAGE_KEY, v1Bytes);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const result = loadParkingStore();

    expect(result.kind).toBe("migrated");
    expect(readV2().parkingItems[0]).not.toHaveProperty("category");
    expect(readV2().parkingItems[0]).not.toHaveProperty("repoUrl");
    expect(readV2().parkingItems[0]).toMatchObject({
      kind: "ai_tool",
      resultUrl: validV1Envelope.items[0].repoUrl,
      effortTier: validV1Envelope.items[0].effortTier,
    });
    expect(localStorage.getItem(V1_STORAGE_KEY)).toBe(v1Bytes);
    expect(setItem).toHaveBeenCalledTimes(1);

    expect(loadParkingStore().kind).toBe("ok");
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("writes nothing when v1 JSON or its strict envelope is invalid", () => {
    for (const invalidV1 of [
      "not-json",
      JSON.stringify({ ...validV1Envelope, unexpected: true }),
    ]) {
      localStorage.clear();
      localStorage.setItem(V1_STORAGE_KEY, invalidV1);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      expect(loadParkingStore()).toMatchObject({ kind: "needs_reset" });
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      setItem.mockRestore();
    }
  });

  it("writes nothing when strict v1 converts to an invalid v2 invariant", () => {
    const invalidConverted = {
      ...validV1Envelope,
      items: [
        {
          ...validV1Envelope.items[0],
          notes: undefined,
          repoUrl: undefined,
        },
      ],
    };
    localStorage.setItem(V1_STORAGE_KEY, JSON.stringify(invalidConverted));
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(loadParkingStore()).toEqual({
      kind: "needs_reset",
      reason: "malformed",
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("validates and saves one complete v2 envelope with one write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(saveParkingStore([customItem])).toEqual({ ok: true });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(readV2()).toEqual({ version: 2, parkingItems: [customItem] });
  });

  it("performs no write when the proposed envelope is invalid", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(saveParkingStore([{ ...customItem, kind: "unknown" } as never])).toEqual({
      ok: false,
      error: "Unable to save parking data in this browser.",
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("reports a write failure instead of discarding in-memory items", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(saveParkingStore([customItem])).toEqual({
      ok: false,
      error: "Unable to save parking data in this browser.",
    });
    expect(customItem.title).toBe("Custom Tool");
  });

  it("replaces modified data with exact cloned v2 fixtures on reset", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, parkingItems: [customItem] }),
    );

    const resetItems = resetParkingStore();

    expect(resetItems).toEqual(makeSeedItems());
    expect(resetItems).not.toBe(makeSeedItems());
    expect(readV2()).toEqual({ version: 2, parkingItems: makeSeedItems() });
  });
});
