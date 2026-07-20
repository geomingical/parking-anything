import { describe, expect, it } from "vitest";

import {
  AnalyzeUrlResponseSchema,
  ManagerPatrolResponseSchema,
  ParkingItemSchema,
} from "./schemas";

const validItem = {
  id: "item-1",
  url: "https://example.com/tool",
  category: "ai_tool" as const,
  status: "parked" as const,
  title: "Example Tool",
  summary: "A concise description of an AI tool.",
  effortTier: "quick_spin" as const,
  suggestedTestTask: "Try one representative input and record the output.",
  usefulnessHypothesis: "Useful if it shortens a repeated evaluation task.",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  lastActivityAt: "2026-07-20T00:00:00.000Z",
};

describe("ParkingItemSchema", () => {
  it.each(["parked", "test_driving", "garaged", "scrapped"] as const)(
    "accepts the %s status",
    (status) => {
      expect(ParkingItemSchema.parse({ ...validItem, status }).status).toBe(status);
    },
  );

  it("rejects an overlong title", () => {
    const result = ParkingItemSchema.safeParse({
      ...validItem,
      title: "x".repeat(121),
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["summary", 401],
    ["usefulnessHypothesis", 401],
    ["suggestedTestTask", 501],
    ["notes", 2001],
    ["finalDecisionReason", 281],
  ] as const)("rejects an overlong %s", (field, length) => {
    expect(
      ParkingItemSchema.safeParse({ ...validItem, [field]: "x".repeat(length) }).success,
    ).toBe(false);
  });

  it.each(["ftp://example.com/tool", "file:///tmp/tool", "not-a-url"])(
    "rejects a non-HTTP(S) item URL: %s",
    (url) => {
      expect(ParkingItemSchema.safeParse({ ...validItem, url }).success).toBe(false);
    },
  );

  it("rejects a non-HTTP(S) result URL", () => {
    expect(
      ParkingItemSchema.safeParse({ ...validItem, repoUrl: "ftp://example.com/result" })
        .success,
    ).toBe(false);
  });
});

describe("API response schemas", () => {
  it("accepts a validated URL-only analysis warning", () => {
    const response = AnalyzeUrlResponseSchema.parse({
      analysis: {
        title: validItem.title,
        summary: validItem.summary,
        effortTier: validItem.effortTier,
        suggestedTestTask: validItem.suggestedTestTask,
        usefulnessHypothesis: validItem.usefulnessHypothesis,
      },
      sourceMode: "url_only",
      warning: "The public page could not be fetched, so analysis used the URL only.",
    });

    expect(response.sourceMode).toBe("url_only");
  });

  it("preserves recommendation provenance", () => {
    expect(
      ManagerPatrolResponseSchema.parse({
        recommendations: [
          {
            itemId: "seed-stale",
            rationale: "Run one focused trial.",
            suggestedAction: "start_test_drive",
            source: "model",
          },
        ],
      }).recommendations[0].source,
    ).toBe("model");
  });

  it("rejects unsupported recommendation provenance", () => {
    expect(
      ManagerPatrolResponseSchema.safeParse({
        recommendations: [
          {
            itemId: "seed-stale",
            rationale: "Run one focused trial.",
            suggestedAction: "start_test_drive",
            source: "unknown",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
