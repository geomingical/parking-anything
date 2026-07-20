import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ParkingItem } from "./schemas";
import { makeSeedItems } from "./fixtures";
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

describe("versioned parking storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initializes exact seed data on first load", () => {
    expect(loadParkingStore()).toEqual({ kind: "initialized", items: makeSeedItems() });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      version: 1,
      items: makeSeedItems(),
    });
  });

  it("does not merge seeds into existing data", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, items: [customItem] }),
    );

    expect(loadParkingStore()).toEqual({ kind: "ok", items: [customItem] });
  });

  it("requires reset for malformed JSON without overwriting it", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");

    expect(loadParkingStore()).toEqual({ kind: "needs_reset", reason: "malformed" });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("not-json");
  });

  it("requires reset for invalid version-one data", () => {
    const invalid = JSON.stringify({ version: 1, items: [{ id: "partial" }] });
    localStorage.setItem(STORAGE_KEY, invalid);

    expect(loadParkingStore()).toEqual({ kind: "needs_reset", reason: "malformed" });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(invalid);
  });

  it("requires reset for a wrong version without overwriting it", () => {
    const oldEnvelope = JSON.stringify({ version: 2, items: [customItem] });
    localStorage.setItem(STORAGE_KEY, oldEnvelope);

    expect(loadParkingStore()).toEqual({
      kind: "needs_reset",
      reason: "wrong_version",
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(oldEnvelope);
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

  it("replaces modified data with exact cloned fixtures on reset", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, items: [customItem] }),
    );

    const resetItems = resetParkingStore();

    expect(resetItems).toEqual(makeSeedItems());
    expect(resetItems).not.toBe(makeSeedItems());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      version: 1,
      items: makeSeedItems(),
    });
  });
});
