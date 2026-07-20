import { describe, expect, it } from "vitest";

import {
  ParkingStoreV1Schema,
  V1_STORAGE_KEY,
  convertV1Envelope,
} from "./storage-v1";

const validV1Item = {
  id: "legacy-tool",
  url: "https://example.com/tool",
  category: "ai_tool" as const,
  status: "garaged" as const,
  title: "Legacy Tool",
  summary: "A migrated tool.",
  effortTier: "focused_session" as const,
  suggestedTestTask: "Run the existing test.",
  usefulnessHypothesis: "Useful if migration preserves it.",
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
  lastActivityAt: "2026-07-19T00:00:00.000Z",
  testStartedAt: "2026-07-18T01:00:00.000Z",
  notes: "Verified before migration.",
  repoUrl: "https://github.com/example/result",
};

describe("frozen v1 storage contract", () => {
  it("uses the unchanged v1 key", () => {
    expect(V1_STORAGE_KEY).toBe("parking-anything:v1");
  });

  it("strictly rejects unknown fields and changed effort tiers", () => {
    expect(
      ParkingStoreV1Schema.safeParse({
        version: 1,
        items: [{ ...validV1Item, unexpected: true }],
      }).success,
    ).toBe(false);
    expect(
      ParkingStoreV1Schema.safeParse({
        version: 1,
        items: [{ ...validV1Item, effortTier: "deep_dive" }],
      }).success,
    ).toBe(false);
  });
});

describe("convertV1Envelope", () => {
  it("maps items exactly to strict v2 parkingItems", () => {
    const v1 = { version: 1 as const, items: [validV1Item] };
    const original = structuredClone(v1);

    const converted = convertV1Envelope(v1);

    expect(converted).toEqual({
      version: 2,
      parkingItems: [
        {
          id: validV1Item.id,
          kind: "ai_tool",
          url: validV1Item.url,
          status: validV1Item.status,
          title: validV1Item.title,
          summary: validV1Item.summary,
          effortTier: validV1Item.effortTier,
          suggestedTestTask: validV1Item.suggestedTestTask,
          usefulnessHypothesis: validV1Item.usefulnessHypothesis,
          createdAt: validV1Item.createdAt,
          updatedAt: validV1Item.updatedAt,
          lastActivityAt: validV1Item.lastActivityAt,
          testStartedAt: validV1Item.testStartedAt,
          notes: validV1Item.notes,
          resultUrl: validV1Item.repoUrl,
        },
      ],
    });
    expect(converted.parkingItems[0]).not.toHaveProperty("category");
    expect(converted.parkingItems[0]).not.toHaveProperty("repoUrl");
    expect(v1).toEqual(original);
  });

  it("validates the complete v2 envelope after conversion", () => {
    expect(() =>
      convertV1Envelope({
        version: 1,
        items: [
          {
            ...validV1Item,
            status: "garaged",
            notes: undefined,
            repoUrl: undefined,
          },
        ],
      }),
    ).toThrow();
  });
});
