import { z } from "zod";

import {
  ParkingStoreV2Schema,
  type ParkingStoreV2,
} from "./schemas";

export const V1_STORAGE_KEY = "parking-anything:v1";

const V1HttpUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Only HTTP(S) URLs are supported");

const V1EffortTierSchema = z.enum([
  "quick_spin",
  "focused_session",
  "weekend_project",
]);

const V1ParkingItemStatusSchema = z.enum([
  "parked",
  "test_driving",
  "garaged",
  "scrapped",
]);

export const ParkingItemV1Schema = z
  .object({
    id: z.string().min(1).max(100),
    url: V1HttpUrlSchema,
    category: z.literal("ai_tool"),
    status: V1ParkingItemStatusSchema,
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(400),
    effortTier: V1EffortTierSchema,
    suggestedTestTask: z.string().trim().min(1).max(500),
    usefulnessHypothesis: z.string().trim().min(1).max(400),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastActivityAt: z.string().datetime(),
    testStartedAt: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
    repoUrl: V1HttpUrlSchema.optional(),
    finalDecisionReason: z.string().trim().min(1).max(280).optional(),
  })
  .strict();

export const ParkingStoreV1Schema = z
  .object({
    version: z.literal(1),
    items: z.array(ParkingItemV1Schema),
  })
  .strict();

export function convertV1Envelope(input: unknown): ParkingStoreV2 {
  const v1 = ParkingStoreV1Schema.parse(input);

  return ParkingStoreV2Schema.parse({
    version: 2,
    parkingItems: v1.items.map(({ category, repoUrl, ...remaining }) => {
      void category;
      return {
        ...remaining,
        kind: "ai_tool" as const,
        ...(repoUrl === undefined ? {} : { resultUrl: repoUrl }),
      };
    }),
  });
}
