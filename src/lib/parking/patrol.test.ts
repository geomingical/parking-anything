import { describe, expect, it } from "vitest";

import { makeSeedItems } from "./fixtures";
import {
  observedFact,
  selectPatrolCandidates,
} from "./patrol";
import type { ParkingItem, PatrolCandidate } from "./schemas";

describe("selectPatrolCandidates", () => {
  it("selects only active items in descending staleness order", () => {
    const items = makeSeedItems();

    expect(
      selectPatrolCandidates(items, new Date("2026-07-20T00:00:00.000Z")),
    ).toEqual([
      {
        id: "seed-stale",
        kind: "ai_tool",
        title: "OpenAI Platform Docs",
        effortTier: "focused_session",
        status: "parked",
        daysSinceActivity: 48,
      },
      {
        id: "seed-driving",
        kind: "ai_tool",
        title: "OpenAI Node SDK",
        effortTier: "focused_session",
        status: "test_driving",
        daysSinceActivity: 1,
      },
    ]);
  });

  it("orders Tool and Idea candidates together by days descending then ID ascending", () => {
    const tool = makeSeedItems()[0];
    const mixed: ParkingItem[] = [
      { ...tool, id: "z-tool", lastActivityAt: "2026-07-10T00:00:00.000Z" },
      {
        id: "b-idea",
        kind: "idea",
        title: "Later tie",
        ideaText: "A private idea body.",
        status: "parked",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        lastActivityAt: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "a-idea",
        kind: "idea",
        title: "Earlier tie",
        ideaText: "Another private idea body.",
        status: "parked",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        lastActivityAt: "2026-07-01T00:00:00.000Z",
      },
      { ...tool, id: "oldest-tool", lastActivityAt: "2026-06-30T00:00:00.000Z" },
    ];

    expect(
      selectPatrolCandidates(mixed, new Date("2026-07-20T00:00:00.000Z")).map(
        ({ id, kind }) => ({ id, kind }),
      ),
    ).toEqual([
      { id: "oldest-tool", kind: "ai_tool" },
      { id: "a-idea", kind: "idea" },
      { id: "b-idea", kind: "idea" },
    ]);
  });

  it("returns at most three candidates without private evidence fields", () => {
    const base = makeSeedItems()[0];
    const items: ParkingItem[] = [
      ...makeSeedItems(),
      ...[2, 3, 4].map((day) => ({
        ...base,
        id: `active-${day}`,
        title: `Active ${day}`,
        lastActivityAt: `2026-07-0${day}T00:00:00.000Z`,
        notes: "private notes",
        resultUrl: "https://github.com/example/private",
        finalDecisionReason: "private decision",
      })),
    ];

    const candidates = selectPatrolCandidates(
      items,
      new Date("2026-07-20T00:00:00.000Z"),
    );

    expect(candidates).toHaveLength(3);
    expect(candidates.map(({ id }) => id)).toEqual([
      "seed-stale",
      "active-2",
      "active-3",
    ]);
    expect(JSON.stringify(candidates)).not.toContain("private");
    expect(candidates[0]).not.toHaveProperty("notes");
    expect(candidates[0]).not.toHaveProperty("resultUrl");
    expect(candidates[0]).not.toHaveProperty("finalDecisionReason");
  });

  it("clamps activity in the future to zero days", () => {
    const future = {
      ...makeSeedItems()[0],
      id: "future",
      lastActivityAt: "2026-07-21T00:00:00.000Z",
    };

    expect(
      selectPatrolCandidates(
        [future],
        new Date("2026-07-20T00:00:00.000Z"),
      )[0].daysSinceActivity,
    ).toBe(0);
  });

  it("returns an empty deterministic candidate list when all items are terminal", () => {
    const terminal = makeSeedItems().map((item, index) => ({
      ...item,
      status: index % 2 === 0 ? "garaged" : "scrapped",
      ...(index % 2 === 0
        ? {}
        : { finalDecisionReason: "Not worth another test." }),
    })) as ParkingItem[];

    expect(
      selectPatrolCandidates(terminal, new Date("2026-07-20T00:00:00.000Z")),
    ).toEqual([]);
  });
});

describe("observedFact", () => {
  it("renders parked facts deterministically", () => {
    expect(
      observedFact({ status: "parked", daysSinceActivity: 48 } as PatrolCandidate),
    ).toBe("This tool has been parked without activity for 48 days.");
  });

  it("renders test-drive facts deterministically with singular grammar", () => {
    expect(
      observedFact({
        status: "test_driving",
        daysSinceActivity: 1,
      } as PatrolCandidate),
    ).toBe("This tool has been test driving without activity for 1 day.");
  });

  it("names Ideas deterministically without claiming access to their body", () => {
    expect(
      observedFact({
        kind: "idea",
        status: "parked",
        daysSinceActivity: 7,
      } as PatrolCandidate),
    ).toBe("This idea has been parked without activity for 7 days.");
  });
});
