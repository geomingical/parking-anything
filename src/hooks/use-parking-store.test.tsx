import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";
import { STORAGE_KEY, saveParkingStore } from "@/lib/parking/storage";
import { useParkingStore } from "./use-parking-store";

const NOW = new Date("2026-07-20T04:00:00.000Z");

const newItem: ParkingItem = {
  ...makeSeedItems()[0],
  id: "new-item",
  title: "New Tool",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  lastActivityAt: NOW.toISOString(),
};

describe("useParkingStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes the exact demo fixtures on first use", () => {
    const { result } = renderHook(() => useParkingStore());

    expect(result.current.items).toEqual(makeSeedItems());
    expect(result.current.needsReset).toBe(false);
  });

  it("adds and persists one complete item", () => {
    const { result } = renderHook(() => useParkingStore());

    act(() => result.current.addItem(newItem));

    expect(result.current.items).toContainEqual(newItem);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).items).toContainEqual(newItem);
  });

  it("applies start and return lifecycle actions", () => {
    const { result } = renderHook(() => useParkingStore());

    act(() => {
      expect(result.current.applyAction("seed-stale", { type: "start_test_drive" })).toEqual({
        ok: true,
      });
    });
    expect(result.current.items.find(({ id }) => id === "seed-stale")).toMatchObject({
      status: "test_driving",
      testStartedAt: NOW.toISOString(),
    });

    act(() => {
      expect(result.current.applyAction("seed-stale", { type: "return_to_lot" })).toEqual({
        ok: true,
      });
    });
    expect(result.current.items.find(({ id }) => id === "seed-stale")?.status).toBe(
      "parked",
    );
  });

  it("returns validation errors without mutating state", () => {
    const { result } = renderHook(() => useParkingStore());
    act(() => {
      result.current.applyAction("seed-stale", { type: "start_test_drive" });
    });
    const before = structuredClone(result.current.items);

    let outcome: ReturnType<typeof result.current.applyAction> | undefined;
    act(() => {
      outcome = result.current.applyAction("seed-stale", {
        type: "park_in_garage",
        notes: "",
        repoUrl: "",
      });
    });

    expect(outcome).toEqual({
      ok: false,
      message: "Add a note or result link before parking in the Garage.",
    });
    expect(result.current.items).toEqual(before);
  });

  it("garages a test drive with evidence", () => {
    const { result } = renderHook(() => useParkingStore());

    act(() => {
      expect(
        result.current.applyAction("seed-driving", {
          type: "park_in_garage",
          notes: "Completed one representative evaluation.",
          repoUrl: "",
        }),
      ).toEqual({ ok: true });
    });

    expect(result.current.items.find(({ id }) => id === "seed-driving")).toMatchObject({
      status: "garaged",
      notes: "Completed one representative evaluation.",
      updatedAt: NOW.toISOString(),
    });
  });

  it("tows an active item with a recorded reason", () => {
    const { result } = renderHook(() => useParkingStore());

    act(() => {
      expect(
        result.current.applyAction("seed-stale", {
          type: "tow_away",
          finalDecisionReason: "No current project justifies the setup time.",
        }),
      ).toEqual({ ok: true });
    });

    expect(result.current.items.find(({ id }) => id === "seed-stale")).toMatchObject({
      status: "scrapped",
      finalDecisionReason: "No current project justifies the setup time.",
    });
  });

  it("keeps new in-memory state and exposes a persistence warning on write failure", () => {
    saveParkingStore(makeSeedItems());
    const { result } = renderHook(() => useParkingStore());
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    act(() => result.current.addItem(newItem));

    expect(result.current.items).toContainEqual(newItem);
    expect(result.current.storageWarning).toBe(
      "Unable to save parking data in this browser.",
    );
  });

  it("updates evidence and activity timestamps", () => {
    const { result } = renderHook(() => useParkingStore());

    act(() => {
      result.current.updateEvidence(
        "seed-driving",
        "New evidence from the test.",
        "https://github.com/example/result",
      );
    });

    expect(result.current.items.find(({ id }) => id === "seed-driving")).toMatchObject({
      notes: "New evidence from the test.",
      repoUrl: "https://github.com/example/result",
      updatedAt: NOW.toISOString(),
      lastActivityAt: NOW.toISOString(),
    });
  });

  it("resets modified data to the exact fixtures", () => {
    const { result } = renderHook(() => useParkingStore());
    act(() => result.current.addItem(newItem));
    act(() => result.current.resetDemo());

    expect(result.current.items).toEqual(makeSeedItems());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).items).toEqual(makeSeedItems());
  });

  it("surfaces malformed storage until the user resets it", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");

    const { result } = renderHook(() => useParkingStore());

    expect(result.current.items).toEqual([]);
    expect(result.current.needsReset).toBe(true);

    act(() => result.current.resetDemo());
    expect(result.current.needsReset).toBe(false);
    expect(result.current.items).toEqual(makeSeedItems());
  });
});
