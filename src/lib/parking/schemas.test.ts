import { describe, expect, it } from "vitest";

import * as schemas from "./schemas";

const {
  AnalyzeUrlResponseSchema,
  ManagerPatrolResponseSchema,
  ParkingItemSchema,
  ParkingStoreV2Schema,
  PatrolCandidateSchema,
} = schemas;

const NOW = "2026-07-20T00:00:00.000Z";

const validTool = {
  id: "tool-1",
  kind: "ai_tool" as const,
  url: "https://example.com/tool",
  status: "parked" as const,
  title: "Example Tool",
  summary: "A concise description of an AI tool.",
  effortTier: "quick_spin" as const,
  suggestedTestTask: "Try one representative input and record the output.",
  usefulnessHypothesis: "Useful if it shortens a repeated evaluation task.",
  createdAt: NOW,
  updatedAt: NOW,
  lastActivityAt: NOW,
};

const validIdea = {
  id: "idea-1",
  kind: "idea" as const,
  status: "parked" as const,
  title: "Compare onboarding flows",
  ideaText: "Prototype both flows with five users.",
  createdAt: NOW,
  updatedAt: NOW,
  lastActivityAt: NOW,
};

function makeTool(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const status = overrides.status ?? validTool.status;
  const requiredByStatus =
    status === "test_driving"
      ? { testStartedAt: NOW }
      : status === "garaged"
        ? { testStartedAt: NOW, notes: "Tested successfully." }
        : status === "scrapped"
          ? { finalDecisionReason: "Not useful enough." }
          : {};

  return { ...validTool, status, ...requiredByStatus, ...overrides };
}

function makeIdea(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const status = overrides.status ?? validIdea.status;
  const requiredByStatus =
    status === "test_driving"
      ? { testStartedAt: NOW }
      : status === "garaged"
        ? { testStartedAt: NOW, notes: "Tested successfully." }
        : status === "scrapped"
          ? { finalDecisionReason: "Not actionable." }
          : {};

  return { ...validIdea, status, ...requiredByStatus, ...overrides };
}

describe("ParkingItemSchema", () => {
  it("accepts strict Tool and Idea variants", () => {
    expect(ParkingItemSchema.parse(validTool).kind).toBe("ai_tool");
    expect(ParkingItemSchema.parse(validIdea).kind).toBe("idea");
  });

  it("rejects v1 and variant-incompatible fields", () => {
    expect(
      ParkingItemSchema.safeParse({ ...validTool, category: "ai_tool" }).success,
    ).toBe(false);
    expect(
      ParkingItemSchema.safeParse({ ...validTool, ideaText: validIdea.ideaText })
        .success,
    ).toBe(false);
    expect(
      ParkingItemSchema.safeParse({ ...validIdea, url: validTool.url }).success,
    ).toBe(false);
  });

  it.each(["quick_spin", "focused_session", "weekend_project"] as const)(
    "preserves the existing %s effort tier",
    (effortTier) => {
      expect(ParkingItemSchema.safeParse(makeTool({ effortTier })).success).toBe(
        true,
      );
    },
  );

  it.each(["half_day", "deep_dive", "quick", "medium"])(
    "rejects the renamed or unsupported effort tier %s",
    (effortTier) => {
      expect(ParkingItemSchema.safeParse(makeTool({ effortTier })).success).toBe(
        false,
      );
    },
  );

  it.each(["parked", "test_driving", "garaged", "scrapped"] as const)(
    "validates the Idea planning invariant for %s",
    (status) => {
      const result = ParkingItemSchema.safeParse(makeIdea({ status }));
      expect(result.success).toBe(status === "parked" || status === "scrapped");
    },
  );

  it("accepts planned test-driving and garaged Ideas", () => {
    const planning = {
      effortTier: "focused_session",
      suggestedTestTask: "Interview five users.",
    };

    expect(
      ParkingItemSchema.safeParse(makeIdea({ status: "test_driving", ...planning }))
        .success,
    ).toBe(true);
    expect(
      ParkingItemSchema.safeParse(makeIdea({ status: "garaged", ...planning }))
        .success,
    ).toBe(true);
  });

  it("requires testStartedAt for test-driving and garaged records", () => {
    expect(
      ParkingItemSchema.safeParse(
        makeTool({ status: "test_driving", testStartedAt: undefined }),
      ).success,
    ).toBe(false);
    expect(
      ParkingItemSchema.safeParse(
        makeTool({ status: "garaged", testStartedAt: undefined }),
      ).success,
    ).toBe(false);
  });

  it("requires evidence for Garage and a reason for Scrapyard", () => {
    expect(
      ParkingItemSchema.safeParse(
        makeTool({ status: "garaged", notes: undefined, resultUrl: undefined }),
      ).success,
    ).toBe(false);
    expect(
      ParkingItemSchema.safeParse(
        makeIdea({ status: "scrapped", finalDecisionReason: undefined }),
      ).success,
    ).toBe(false);
  });

  it.each([
    ["title", 121],
    ["summary", 401],
    ["usefulnessHypothesis", 401],
    ["suggestedTestTask", 501],
    ["notes", 2001],
    ["finalDecisionReason", 281],
  ] as const)("rejects an overlong %s", (field, length) => {
    expect(
      ParkingItemSchema.safeParse(makeTool({ [field]: "x".repeat(length) }))
        .success,
    ).toBe(false);
  });

  it("enforces Idea text and identifier bounds", () => {
    expect(
      ParkingItemSchema.safeParse(makeIdea({ ideaText: "x".repeat(2001) })).success,
    ).toBe(false);
    expect(
      ParkingItemSchema.safeParse(makeIdea({ id: "x".repeat(101) })).success,
    ).toBe(false);
  });

  it("normalizes blank optional text to absence", () => {
    const parsed = ParkingItemSchema.parse(
      makeIdea({ notes: "   ", suggestedTestTask: "  " }),
    );

    expect(parsed.notes).toBeUndefined();
    expect(parsed.suggestedTestTask).toBeUndefined();
  });

  it.each(["ftp://example.com/tool", "file:///tmp/tool", "not-a-url"])(
    "rejects a non-HTTP(S) Tool URL: %s",
    (url) => {
      expect(ParkingItemSchema.safeParse(makeTool({ url })).success).toBe(false);
    },
  );

  it("rejects a non-HTTP(S) result URL", () => {
    expect(
      ParkingItemSchema.safeParse(
        makeTool({ resultUrl: "ftp://example.com/result" }),
      ).success,
    ).toBe(false);
  });
});

describe("ParkingStoreV2Schema", () => {
  it("validates a strict complete v2 envelope", () => {
    const schema = (
      schemas as unknown as {
        ParkingStoreV2Schema?: {
          safeParse: (input: unknown) => { success: boolean };
        };
      }
    ).ParkingStoreV2Schema;

    expect(schema).toBeDefined();
    expect(
      schema?.safeParse({ version: 2, parkingItems: [validTool, validIdea] })
        .success,
    ).toBe(true);
    expect(
      schema?.safeParse({
        version: 2,
        parkingItems: [validTool],
        items: [validTool],
      }).success,
    ).toBe(false);
  });
});

describe("PatrolCandidateSchema", () => {
  it("requires kind and allows an unplanned Idea", () => {
    expect(
      PatrolCandidateSchema.safeParse({
        id: "idea-1",
        kind: "idea",
        title: "Compare onboarding flows",
        status: "parked",
        daysSinceActivity: 8,
      }).success,
    ).toBe(true);
    expect(
      PatrolCandidateSchema.safeParse({
        id: "idea-1",
        title: "Compare onboarding flows",
        status: "parked",
        daysSinceActivity: 8,
      }).success,
    ).toBe(false);
  });

  it("rejects private or unrelated fields", () => {
    const boundedCandidate = {
      id: "idea-1",
      kind: "idea",
      title: "Compare onboarding flows",
      status: "parked",
      daysSinceActivity: 8,
    };

    for (const privateField of [
      "ideaText",
      "summary",
      "notes",
      "usefulnessHypothesis",
      "url",
      "resultUrl",
      "finalDecisionReason",
      "parkingItems",
    ]) {
      expect(
        PatrolCandidateSchema.safeParse({
          ...boundedCandidate,
          [privateField]: "private",
        }).success,
      ).toBe(false);
    }
  });
});

describe("API response schemas", () => {
  it("accepts a validated URL-only analysis warning", () => {
    const response = AnalyzeUrlResponseSchema.parse({
      analysis: {
        title: validTool.title,
        summary: validTool.summary,
        effortTier: validTool.effortTier,
        suggestedTestTask: validTool.suggestedTestTask,
        usefulnessHypothesis: validTool.usefulnessHypothesis,
      },
      sourceMode: "url_only",
      warning: "The public page could not be fetched, so analysis used the URL only.",
      classification: {
        suggestedKind: "ai_tool",
        rationale: "Looks like a hosted tool.",
      },
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

describe("read parking items", () => {
  const readItem = {
    id: "read-1",
    kind: "read" as const,
    status: "parked" as const,
    url: "https://example.com/article",
    title: "On interface craft",
    summary: "Argues that small details compound into perceived quality.",
    effortTier: "focused_session" as const,
    suggestedTestTask: "Decide which single detail to apply to the lot cards.",
    usefulnessHypothesis: "It may sharpen the next visual pass.",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    lastActivityAt: "2026-07-30T00:00:00.000Z",
  };

  it("accepts a read item", () => {
    expect(ParkingItemSchema.parse(readItem).kind).toBe("read");
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      ParkingItemSchema.parse({ ...readItem, kind: "podcast" }),
    ).toThrow();
  });

  it("rejects classification fields on a stored item", () => {
    expect(() =>
      ParkingItemSchema.parse({ ...readItem, suggestedKind: "ai_tool" }),
    ).toThrow();
  });

  it("keeps stored v2 payloads valid without migration", () => {
    const envelope = { version: 2, parkingItems: [readItem] };
    expect(ParkingStoreV2Schema.parse(envelope).version).toBe(2);
  });

  it("carries a classification separate from the stored analysis", () => {
    const response = AnalyzeUrlResponseSchema.parse({
      analysis: {
        title: readItem.title,
        summary: readItem.summary,
        effortTier: readItem.effortTier,
        suggestedTestTask: readItem.suggestedTestTask,
        usefulnessHypothesis: readItem.usefulnessHypothesis,
      },
      sourceMode: "fetched",
      classification: { suggestedKind: "read", rationale: "Long-form prose." },
    });
    expect(response.classification.suggestedKind).toBe("read");
    expect(response.analysis).not.toHaveProperty("suggestedKind");
  });
});
