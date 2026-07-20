import { z } from "zod";

const httpUrl = z
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

export const EffortTierSchema = z.enum([
  "quick_spin",
  "focused_session",
  "weekend_project",
]);

export const ParkingItemStatusSchema = z.enum([
  "parked",
  "test_driving",
  "garaged",
  "scrapped",
]);

export const AnalyzeUrlResultSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(400),
    effortTier: EffortTierSchema,
    suggestedTestTask: z.string().trim().min(1).max(500),
    usefulnessHypothesis: z.string().trim().min(1).max(400),
  })
  .strict();

export const AnalyzeUrlResponseSchema = z
  .object({
    analysis: AnalyzeUrlResultSchema,
    sourceMode: z.enum(["fetched", "url_only"]),
    warning: z.string().max(280).optional(),
  })
  .strict();

export const ParkingItemSchema = AnalyzeUrlResultSchema.extend({
  id: z.string().min(1).max(100),
  url: httpUrl,
  category: z.literal("ai_tool"),
  status: ParkingItemStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  testStartedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  repoUrl: httpUrl.optional(),
  finalDecisionReason: z.string().trim().min(1).max(280).optional(),
}).strict();

export const PatrolCandidateSchema = ParkingItemSchema.pick({
  id: true,
  title: true,
  effortTier: true,
})
  .extend({
    status: z.enum(["parked", "test_driving"]),
    daysSinceActivity: z.number().finite().int().nonnegative(),
  })
  .strict();

export const SuggestedActionSchema = z.enum([
  "start_test_drive",
  "return_to_lot",
  "scrap",
]);

export const ModelPatrolRecommendationSchema = z
  .object({
    itemId: z.string().min(1).max(100),
    rationale: z.string().trim().min(1).max(280),
    suggestedAction: SuggestedActionSchema,
  })
  .strict();

export const ManagerPatrolResultSchema = z
  .object({
    recommendations: z.array(ModelPatrolRecommendationSchema).max(3),
  })
  .strict();

export const PatrolRecommendationSchema = ModelPatrolRecommendationSchema.extend({
  source: z.enum(["model", "fallback"]),
}).strict();

export const ManagerPatrolResponseSchema = z
  .object({
    recommendations: z.array(PatrolRecommendationSchema).max(3),
  })
  .strict();

export type EffortTier = z.infer<typeof EffortTierSchema>;
export type ParkingItem = z.infer<typeof ParkingItemSchema>;
export type ParkingItemStatus = z.infer<typeof ParkingItemStatusSchema>;
export type AnalyzeUrlResult = z.infer<typeof AnalyzeUrlResultSchema>;
export type AnalyzeUrlResponse = z.infer<typeof AnalyzeUrlResponseSchema>;
export type PatrolCandidate = z.infer<typeof PatrolCandidateSchema>;
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;
export type ModelPatrolRecommendation = z.infer<
  typeof ModelPatrolRecommendationSchema
>;
export type ManagerPatrolResult = z.infer<typeof ManagerPatrolResultSchema>;
export type PatrolRecommendation = z.infer<typeof PatrolRecommendationSchema>;
export type ManagerPatrolResponse = z.infer<typeof ManagerPatrolResponseSchema>;
