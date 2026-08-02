import { z } from "zod";

import { LINK_KIND_IDS } from "./link-kinds";

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

const optionalTrimmedText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

const optionalHttpUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  httpUrl.optional(),
);

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

/** What the model returns. Wider than what is stored. */
export const AnalyzeUrlModelResultSchema = AnalyzeUrlResultSchema.extend({
  suggestedKind: z.enum(LINK_KIND_IDS),
  kindRationale: z.string().trim().min(1).max(200),
}).strict();

export const AnalyzeClassificationSchema = z
  .object({
    suggestedKind: z.enum(LINK_KIND_IDS),
    rationale: z.string().trim().min(1).max(200),
  })
  .strict();

export const AnalyzeUrlResponseSchema = z
  .object({
    analysis: AnalyzeUrlResultSchema,
    sourceMode: z.enum(["fetched", "url_only"]),
    warning: z.string().max(280).optional(),
    classification: AnalyzeClassificationSchema,
  })
  .strict();

const ParkingItemBaseShape = {
  id: z.string().min(1).max(100),
  status: ParkingItemStatusSchema,
  title: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  testStartedAt: z.string().datetime().optional(),
  notes: optionalTrimmedText(2000),
  resultUrl: optionalHttpUrl,
  finalDecisionReason: optionalTrimmedText(280),
};

const LinkParkingItemShape = {
  ...ParkingItemBaseShape,
  url: httpUrl,
  summary: z.string().trim().min(1).max(400),
  effortTier: EffortTierSchema,
  suggestedTestTask: z.string().trim().min(1).max(500),
  usefulnessHypothesis: z.string().trim().min(1).max(400),
  /*
   * The model's own opinion of what this item is, and why. A property OF THE
   * ITEM, so it shares the item's lifecycle instead of chasing it from
   * transient UI state. Both optional: stored v2 data predating them still
   * parses, so no migration is needed.
   *
   * These are only ever set by an explicit assignment from a response's
   * `classification` block. AnalyzeUrlResultSchema above is strict and holds
   * exactly its five stored fields, so the `...analysis` spread used when
   * building or re-parking an item cannot introduce them by accident.
   */
  suggestedKind: z.enum(LINK_KIND_IDS).optional(),
  kindRationale: optionalTrimmedText(200),
};

export const AiToolParkingItemSchema = z
  .object({ ...LinkParkingItemShape, kind: z.literal("ai_tool") })
  .strict();

export const ReadParkingItemSchema = z
  .object({ ...LinkParkingItemShape, kind: z.literal("read") })
  .strict();

export const IdeaParkingItemSchema = z
  .object({
    ...ParkingItemBaseShape,
    kind: z.literal("idea"),
    ideaText: z.string().trim().min(1).max(2000),
    effortTier: EffortTierSchema.optional(),
    suggestedTestTask: optionalTrimmedText(500),
  })
  .strict();

export const ParkingItemSchema = z
  .discriminatedUnion("kind", [
    AiToolParkingItemSchema,
    ReadParkingItemSchema,
    IdeaParkingItemSchema,
  ])
  .superRefine((item, context) => {
    if (
      item.kind === "idea" &&
      (item.status === "test_driving" || item.status === "garaged")
    ) {
      if (!item.effortTier) {
        context.addIssue({
          code: "custom",
          path: ["effortTier"],
          message: "An active Idea requires an effort tier.",
        });
      }

      if (!item.suggestedTestTask) {
        context.addIssue({
          code: "custom",
          path: ["suggestedTestTask"],
          message: "An active Idea requires a first test task.",
        });
      }
    }

    if (
      (item.status === "test_driving" || item.status === "garaged") &&
      !item.testStartedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["testStartedAt"],
        message: "Test-driving and garaged items require a Test Drive timestamp.",
      });
    }

    if (item.status === "garaged" && !item.notes && !item.resultUrl) {
      context.addIssue({
        code: "custom",
        path: ["notes"],
        message: "Garage requires notes or a result URL.",
      });
    }

    if (item.status === "scrapped" && !item.finalDecisionReason) {
      context.addIssue({
        code: "custom",
        path: ["finalDecisionReason"],
        message: "Scrapyard requires a final decision reason.",
      });
    }
  });

export const ParkingStoreV2Schema = z
  .object({
    version: z.literal(2),
    parkingItems: z.array(ParkingItemSchema),
  })
  .strict();

export const PatrolCandidateSchema = z
  .object({
    id: z.string().min(1).max(100),
    kind: z.enum([...LINK_KIND_IDS, "idea"]),
    title: z.string().trim().min(1).max(120),
    effortTier: EffortTierSchema.optional(),
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
export type AiToolParkingItem = z.infer<typeof AiToolParkingItemSchema>;
export type ReadParkingItem = z.infer<typeof ReadParkingItemSchema>;
export type IdeaParkingItem = z.infer<typeof IdeaParkingItemSchema>;
export type ParkingStoreV2 = z.infer<typeof ParkingStoreV2Schema>;
export type ParkingItemStatus = z.infer<typeof ParkingItemStatusSchema>;
export type AnalyzeUrlResult = z.infer<typeof AnalyzeUrlResultSchema>;
export type AnalyzeUrlModelResult = z.infer<typeof AnalyzeUrlModelResultSchema>;
export type AnalyzeClassification = z.infer<typeof AnalyzeClassificationSchema>;
export type AnalyzeUrlResponse = z.infer<typeof AnalyzeUrlResponseSchema>;
export type PatrolCandidate = z.infer<typeof PatrolCandidateSchema>;
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;
export type ModelPatrolRecommendation = z.infer<
  typeof ModelPatrolRecommendationSchema
>;
export type ManagerPatrolResult = z.infer<typeof ManagerPatrolResultSchema>;
export type PatrolRecommendation = z.infer<typeof PatrolRecommendationSchema>;
export type ManagerPatrolResponse = z.infer<typeof ManagerPatrolResponseSchema>;
