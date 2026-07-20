import { z } from "zod";

import { ParkingItemSchema, type ParkingItem } from "./schemas";

const SeedItemsSchema = z.array(ParkingItemSchema).length(3);

export function makeSeedItems(): ParkingItem[] {
  const items = SeedItemsSchema.parse([
    {
      id: "seed-stale",
      url: "https://platform.openai.com/docs",
      category: "ai_tool",
      status: "parked",
      title: "OpenAI Platform Docs",
      summary: "API documentation saved for a future prototype.",
      effortTier: "focused_session",
      suggestedTestTask: "Build one typed Responses API request and record the result.",
      usefulnessHypothesis:
        "Useful if a real API workflow is tested instead of only bookmarked.",
      createdAt: "2026-06-01T08:00:00.000Z",
      updatedAt: "2026-06-01T08:00:00.000Z",
      lastActivityAt: "2026-06-01T08:00:00.000Z",
    },
    {
      id: "seed-driving",
      url: "https://github.com/openai/openai-node",
      category: "ai_tool",
      status: "test_driving",
      title: "OpenAI Node SDK",
      summary: "The official JavaScript and TypeScript client for the OpenAI API.",
      effortTier: "focused_session",
      suggestedTestTask:
        "Run one typed structured-output request against a small URL-analysis fixture.",
      usefulnessHypothesis:
        "Useful when the SDK removes schema plumbing from a real API route.",
      createdAt: "2026-07-12T08:00:00.000Z",
      updatedAt: "2026-07-18T08:00:00.000Z",
      lastActivityAt: "2026-07-18T08:00:00.000Z",
      testStartedAt: "2026-07-18T07:30:00.000Z",
      notes: "Installed the SDK and verified the Responses API TypeScript types.",
    },
    {
      id: "seed-garaged",
      url: "https://developers.openai.com/api/docs/guides/structured-outputs",
      category: "ai_tool",
      status: "garaged",
      title: "Structured Outputs Guide",
      summary: "A guide for enforcing typed model responses with JSON Schema or Zod.",
      effortTier: "quick_spin",
      suggestedTestTask:
        "Define one Zod schema and parse a typed response without manual JSON cleanup.",
      usefulnessHypothesis:
        "Useful because reliable DTOs simplify both UI and fallback validation.",
      createdAt: "2026-07-10T08:00:00.000Z",
      updatedAt: "2026-07-19T08:00:00.000Z",
      lastActivityAt: "2026-07-19T08:00:00.000Z",
      testStartedAt: "2026-07-19T07:00:00.000Z",
      notes: "Validated a Zod-backed response and kept the schema as the source of truth.",
      repoUrl: "https://github.com/openai/openai-node",
    },
  ] satisfies ParkingItem[]);

  return structuredClone(items);
}
