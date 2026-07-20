import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";
import { STORAGE_KEY, saveParkingStore } from "@/lib/parking/storage";
import { useParkingStore } from "./use-parking-store";

const NOW = new Date("2026-07-20T04:00:00.000Z");

const newTool: ParkingItem = {
  ...makeSeedItems()[0],
  id: "new-tool",
  title: "New Tool",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  lastActivityAt: NOW.toISOString(),
};

const newIdea: ParkingItem = {
  id: "idea-1",
  kind: "idea",
  status: "parked",
  title: "Compare onboarding flows",
  ideaText: "Prototype both flows with five users.",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  lastActivityAt: NOW.toISOString(),
};

function storedItems(): ParkingItem[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!).parkingItems;
}

describe("useParkingStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

  it("adds and persists one complete Idea", () => {
    const { result } = renderHook(() => useParkingStore());
    let outcome;

    act(() => {
      outcome = result.current.addItem(newIdea);
    });

    expect(outcome).toEqual({ ok: true });
    expect(result.current.items).toContainEqual(newIdea);
    expect(storedItems()).toContainEqual(newIdea);
  });

  it("rejects an invalid added item without mutating or writing", () => {
    const { result } = renderHook(() => useParkingStore());
    const before = structuredClone(result.current.items);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    setItem.mockClear();
    let outcome;

    act(() => {
      outcome = result.current.addItem({ ...newIdea, title: "" } as ParkingItem);
    });

    expect(outcome).toMatchObject({ ok: false });
    expect(result.current.items).toEqual(before);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("applies start and return lifecycle actions", () => {
    const { result } = renderHook(() => useParkingStore());

    act(() => {
      expect(
        result.current.applyAction("seed-stale", { type: "start_test_drive" }),
      ).toEqual({ ok: true });
    });
    expect(result.current.items.find(({ id }) => id === "seed-stale")).toMatchObject({
      status: "test_driving",
      testStartedAt: NOW.toISOString(),
    });

    act(() => {
      expect(
        result.current.applyAction("seed-stale", { type: "return_to_lot" }),
      ).toEqual({ ok: true });
    });
    expect(result.current.items.find(({ id }) => id === "seed-stale")?.status).toBe(
      "parked",
    );
  });

  it("returns transition errors without mutating state", () => {
    const { result } = renderHook(() => useParkingStore());
    act(() => {
      result.current.applyAction("seed-stale", { type: "start_test_drive" });
    });
    const before = structuredClone(result.current.items);
    let outcome;

    act(() => {
      outcome = result.current.applyAction("seed-stale", {
        type: "park_in_garage",
        notes: "",
        resultUrl: "",
      });
    });

    expect(outcome).toEqual({
      ok: false,
      message: "Add a note or result link before parking in the Garage.",
    });
    expect(result.current.items).toEqual(before);
  });

  it("garages a test drive with result evidence", () => {
    const { result } = renderHook(() => useParkingStore());

    act(() => {
      expect(
        result.current.applyAction("seed-driving", {
          type: "park_in_garage",
          notes: "Completed one representative evaluation.",
          resultUrl: "https://example.com/result",
        }),
      ).toEqual({ ok: true });
    });

    expect(result.current.items.find(({ id }) => id === "seed-driving")).toMatchObject({
      status: "garaged",
      notes: "Completed one representative evaluation.",
      resultUrl: "https://example.com/result",
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

  it("keeps a valid new state and exposes a persistence warning on write failure", () => {
    saveParkingStore(makeSeedItems());
    const { result } = renderHook(() => useParkingStore());
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    let outcome;

    act(() => {
      outcome = result.current.addItem(newIdea);
    });

    expect(outcome).toEqual({ ok: true });
    expect(result.current.items).toContainEqual(newIdea);
    expect(result.current.storageWarning).toBe(
      "Unable to save parking data in this browser.",
    );
  });

  it("updates active evidence through resultUrl and refreshes activity", () => {
    const { result } = renderHook(() => useParkingStore());
    let outcome;

    act(() => {
      outcome = result.current.updateEvidence(
        "seed-driving",
        "New evidence from the test.",
        "https://example.com/result",
      );
    });

    expect(outcome).toEqual({ ok: true });
    expect(result.current.items.find(({ id }) => id === "seed-driving")).toMatchObject({
      notes: "New evidence from the test.",
      resultUrl: "https://example.com/result",
      updatedAt: NOW.toISOString(),
      lastActivityAt: NOW.toISOString(),
    });
  });

  it("updates an active Idea and immediately publishes valid planning", () => {
    const { result } = renderHook(() => useParkingStore());
    act(() => {
      result.current.addItem(newIdea);
    });
    let outcome;

    act(() => {
      outcome = result.current.updateIdea(newIdea.id, {
        title: "Compare two onboarding flows",
        ideaText: "Prototype and compare both flows.",
        effortTier: "focused_session",
        suggestedTestTask: "Interview five users.",
      });
    });

    expect(outcome).toEqual({ ok: true });
    expect(result.current.items.find(({ id }) => id === newIdea.id)).toMatchObject({
      title: "Compare two onboarding flows",
      effortTier: "focused_session",
      suggestedTestTask: "Interview five users.",
      updatedAt: NOW.toISOString(),
      lastActivityAt: NOW.toISOString(),
    });
    expect(storedItems().find(({ id }) => id === newIdea.id)).toMatchObject({
      effortTier: "focused_session",
      suggestedTestTask: "Interview five users.",
    });
  });

  it("rejects clearing planning from a test-driving Idea", () => {
    saveParkingStore([
      {
        ...newIdea,
        status: "test_driving",
        effortTier: "quick_spin",
        suggestedTestTask: "Run one interview.",
        testStartedAt: NOW.toISOString(),
      },
    ]);
    const { result } = renderHook(() => useParkingStore());
    const before = structuredClone(result.current.items);
    let outcome;

    act(() => {
      outcome = result.current.updateIdea(newIdea.id, {
        title: newIdea.title,
        ideaText: newIdea.ideaText,
        effortTier: undefined,
        suggestedTestTask: undefined,
      });
    });

    expect(outcome).toMatchObject({ ok: false });
    expect(result.current.items).toEqual(before);
  });

  it.each(["garaged", "scrapped"] as const)(
    "rejects edits to terminal %s records",
    (status) => {
      const terminal = makeSeedItems().find((item) =>
        status === "garaged" ? item.status === "garaged" : item.status === "parked",
      )!;
      const terminalItem: ParkingItem =
        status === "garaged"
          ? terminal
          : {
              ...terminal,
              status: "scrapped",
              finalDecisionReason: "Not worth continuing.",
            };
      saveParkingStore([terminalItem]);
      const { result } = renderHook(() => useParkingStore());
      const before = structuredClone(result.current.items);
      let outcome;

      act(() => {
        outcome = result.current.updateEvidence(
          terminalItem.id,
          "Changed after decision.",
          "",
        );
      });

      expect(outcome).toMatchObject({ ok: false });
      expect(result.current.items).toEqual(before);
    },
  );

  it("resets modified data to the exact fixtures", () => {
    const { result } = renderHook(() => useParkingStore());
    act(() => {
      result.current.addItem(newTool);
      result.current.resetDemo();
    });

    expect(result.current.items).toEqual(makeSeedItems());
    expect(storedItems()).toEqual(makeSeedItems());
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
