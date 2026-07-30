import { describe, expect, it } from "vitest";

import type { ParkingItem } from "./schemas";
import { transitionItem } from "./transitions";

const NOW = "2026-07-20T01:00:00.000Z";

const parkedItem: ParkingItem = {
  id: "item-1",
  url: "https://example.com/tool",
  kind: "ai_tool",
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

const parkedIdea: ParkingItem = {
  id: "idea-1",
  kind: "idea",
  status: "parked",
  title: "Compare onboarding flows",
  ideaText: "Prototype both flows with five users.",
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
  lastActivityAt: "2026-07-19T00:00:00.000Z",
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

  it("blocks an unplanned Idea from Test Drive without mutation", () => {
    const original = structuredClone(parkedIdea);

    expect(() =>
      transitionItem(parkedIdea, { type: "start_test_drive" }, NOW),
    ).toThrow(
      "Add an effort tier and first test task before starting a Test Drive.",
    );
    expect(parkedIdea).toEqual(original);
  });

  it("starts a planned Idea Test Drive through the shared transition", () => {
    const plannedIdea: ParkingItem = {
      ...parkedIdea,
      effortTier: "focused_session",
      suggestedTestTask: "Interview five users.",
    };

    expect(
      transitionItem(plannedIdea, { type: "start_test_drive" }, NOW),
    ).toMatchObject({
      id: plannedIdea.id,
      kind: "idea",
      status: "test_driving",
      testStartedAt: NOW,
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
        { type: "park_in_garage", notes: "Evaluation completed.", resultUrl: "" },
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
          resultUrl: "https://github.com/example/result",
        },
        NOW,
      ),
    ).toMatchObject({
      status: "garaged",
      resultUrl: "https://github.com/example/result",
    });
  });

  it("blocks Garage when both evidence fields are empty", () => {
    expect(() =>
      transitionItem(
        testDrivingItem,
        { type: "park_in_garage", notes: "", resultUrl: "" },
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

  it("allows direct Tow Away for an unplanned parked Idea", () => {
    expect(
      transitionItem(
        parkedIdea,
        { type: "tow_away", finalDecisionReason: "Not actionable." },
        NOW,
      ),
    ).toMatchObject({
      id: parkedIdea.id,
      kind: "idea",
      status: "scrapped",
      finalDecisionReason: "Not actionable.",
    });
  });

  it.each([parkedItem, testDrivingItem])(
    "blocks Tow Away from $status without a reason",
    (item) => {
      expect(() =>
        transitionItem(
          item,
          { type: "tow_away", finalDecisionReason: "   " },
          NOW,
        ),
      ).toThrow("Record why this is leaving before towing it away.");
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

  it("validates every accepted next item against the persisted schema", () => {
    const invalidInput = {
      ...parkedItem,
      summary: undefined,
    } as unknown as ParkingItem;

    expect(() =>
      transitionItem(invalidInput, { type: "start_test_drive" }, NOW),
    ).toThrow();
  });

  it("asks for a tow reason without naming the item a tool", () => {
    const idea = {
      id: "idea-tow",
      kind: "idea" as const,
      status: "parked" as const,
      title: "Unbounded idea",
      ideaText: "Not ready to test.",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
      lastActivityAt: "2026-07-30T00:00:00.000Z",
    };

    expect(() =>
      transitionItem(idea, { type: "tow_away", finalDecisionReason: "" },
        "2026-07-30T01:00:00.000Z"),
    ).toThrow("Record why this is leaving before towing it away.");
  });
});
