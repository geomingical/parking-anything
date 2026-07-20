import { describe, expect, it } from "vitest";

import type { ParkingItem } from "./schemas";
import { transitionItem } from "./transitions";

const NOW = "2026-07-20T01:00:00.000Z";

const parkedItem: ParkingItem = {
  id: "item-1",
  url: "https://example.com/tool",
  category: "ai_tool",
  status: "parked",
  title: "Example Tool",
  summary: "A concise description of an AI tool.",
  effortTier: "quick_spin",
  suggestedTestTask: "Try one representative input and record the output.",
  usefulnessHypothesis: "Useful if it shortens a repeated evaluation task.",
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
  lastActivityAt: "2026-07-19T00:00:00.000Z",
};

const testDrivingItem: ParkingItem = {
  ...parkedItem,
  status: "test_driving",
  testStartedAt: "2026-07-19T02:00:00.000Z",
};

describe("transitionItem", () => {
  it("starts a test drive and updates activity timestamps", () => {
    expect(transitionItem(parkedItem, { type: "start_test_drive" }, NOW)).toEqual({
      ...parkedItem,
      status: "test_driving",
      testStartedAt: NOW,
      updatedAt: NOW,
      lastActivityAt: NOW,
    });
  });

  it("returns a test-driving item to the lot without clearing evidence", () => {
    const item = { ...testDrivingItem, notes: "Tried one sample." };

    expect(transitionItem(item, { type: "return_to_lot" }, NOW)).toEqual({
      ...item,
      status: "parked",
      updatedAt: NOW,
      lastActivityAt: NOW,
    });
  });

  it("garages a test-driving item with notes", () => {
    expect(
      transitionItem(
        testDrivingItem,
        { type: "park_in_garage", notes: "Evaluation completed.", repoUrl: "" },
        NOW,
      ),
    ).toMatchObject({
      status: "garaged",
      notes: "Evaluation completed.",
      updatedAt: NOW,
      lastActivityAt: NOW,
    });
  });

  it("garages a test-driving item with a result link", () => {
    expect(
      transitionItem(
        testDrivingItem,
        {
          type: "park_in_garage",
          notes: "",
          repoUrl: "https://github.com/example/result",
        },
        NOW,
      ),
    ).toMatchObject({
      status: "garaged",
      repoUrl: "https://github.com/example/result",
    });
  });

  it("blocks Garage when both evidence fields are empty", () => {
    expect(() =>
      transitionItem(
        testDrivingItem,
        { type: "park_in_garage", notes: "", repoUrl: "" },
        NOW,
      ),
    ).toThrow("Add a note or result link before parking in the Garage.");
  });

  it.each([parkedItem, testDrivingItem])(
    "tows an active $status item with a decision reason",
    (item) => {
      expect(
        transitionItem(
          item,
          {
            type: "tow_away",
            finalDecisionReason: "The setup cost exceeds the expected value.",
          },
          NOW,
        ),
      ).toMatchObject({
        status: "scrapped",
        finalDecisionReason: "The setup cost exceeds the expected value.",
        updatedAt: NOW,
        lastActivityAt: NOW,
      });
    },
  );

  it.each([parkedItem, testDrivingItem])(
    "blocks Tow Away from $status without a reason",
    (item) => {
      expect(() =>
        transitionItem(
          item,
          { type: "tow_away", finalDecisionReason: "   " },
          NOW,
        ),
      ).toThrow("Record why this tool is leaving before towing it away.");
    },
  );

  it.each(["garaged", "scrapped"] as const)(
    "rejects state changes from terminal status %s",
    (status) => {
      expect(() =>
        transitionItem({ ...testDrivingItem, status }, { type: "return_to_lot" }, NOW),
      ).toThrow("This item has reached a final decision and cannot be moved.");
    },
  );

  it("rejects an action that is unavailable for the current status", () => {
    expect(() =>
      transitionItem(parkedItem, { type: "return_to_lot" }, NOW),
    ).toThrow("This action is not available for the item's current status.");
  });

  it("returns a new item without mutating the input", () => {
    const original = structuredClone(parkedItem);
    const result = transitionItem(parkedItem, { type: "start_test_drive" }, NOW);

    expect(result).not.toBe(parkedItem);
    expect(parkedItem).toEqual(original);
  });
});
