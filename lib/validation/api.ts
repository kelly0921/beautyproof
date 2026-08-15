import { z } from "zod";

export const scenarioSchema = z.enum(["keep", "swap", "inconclusive"]);
export const taskRequestSchema = z.object({ kind: z.enum(["baseline", "followup"]), scenario: scenarioSchema.default("keep"), allowCachedFallback: z.boolean().default(false) });
export const windowSchema = z.object({ formulaVersionId: z.literal("formula-2026-us"), claimId: z.literal("claim-hydration-2026"), baselineAnalysisId: z.string().min(1), startDate: z.string().date(), plannedEndDate: z.string().date(), returnDeadline: z.string().date(), status: z.literal("active"), campaignEnrollmentId: z.string().min(1).optional() });
export const checkInSchema = z.object({ date: z.string().date(), usedProduct: z.boolean(), experience: z.enum(["good", "neutral", "concern"]), confounderNote: z.string().max(400).optional() });
export const completeWindowSchema = z.object({
  scenario: scenarioSchema.default("keep"),
  followupAnalysisId: z.string().min(1),
  completedUses: z.number().int().min(0).max(365),
  experience: z.enum(["good", "neutral", "concern"]).default("neutral"),
  majorConfounder: z.boolean().default(false),
  demoTimeJump: z.boolean().default(false),
});
export const consentSchema = z.object({ consent: z.literal(true) });
export const campaignStatusSchema = z.enum(["draft", "active", "paused", "completed"]);
export const metricRangeSchema = z.object({ min: z.number().min(0).max(100).optional(), max: z.number().min(0).max(100).optional() }).refine((range) => range.min === undefined || range.max === undefined || range.min <= range.max, "Metric range minimum must not exceed its maximum.");
export const campaignInputSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.literal("brand-aster-vale"),
  formulaVersionId: z.literal("formula-2026-us"),
  claimId: z.enum(["claim-hydration-2026", "claim-finish-2026", "claim-barrier-2026"]),
  title: z.string().min(1).max(160),
  purpose: z.string().min(1).max(500),
  status: campaignStatusSchema.default("draft"),
  targetReceiptCount: z.number().int().min(1).max(10000),
  targetMetricRanges: z.object({ hd_moisture: metricRangeSchema.optional(), hd_redness: metricRangeSchema.optional(), hd_texture: metricRangeSchema.optional(), hd_oiliness: metricRangeSchema.optional() }),
  requiredDurationDays: z.number().int().min(1).max(365),
  rewardType: z.enum(["store_credit", "cash", "points", "sample"]),
  rewardAmountCents: z.number().int().min(0).max(100000),
  rewardLabel: z.string().min(1).max(120),
  currency: z.literal("USD"),
  outcomeNeutral: z.literal(true),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});
export const campaignPatchSchema = z.object({
  status: campaignStatusSchema.optional(),
  targetReceiptCount: z.number().int().min(1).max(10000).optional(),
  targetMetricRanges: z.object({ hd_moisture: metricRangeSchema.optional(), hd_redness: metricRangeSchema.optional(), hd_texture: metricRangeSchema.optional(), hd_oiliness: metricRangeSchema.optional() }).optional(),
  requiredDurationDays: z.number().int().min(1).max(365).optional(),
  rewardType: z.enum(["store_credit", "cash", "points", "sample"]).optional(),
  rewardAmountCents: z.number().int().min(0).max(100000).optional(),
  rewardLabel: z.string().min(1).max(120).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
}).refine((input) => Object.keys(input).length > 0, "At least one campaign field is required.");
export const campaignEligibilitySchema = z.object({ baselineAnalysisId: z.string().min(1) });
export const campaignEnrollmentSchema = z.object({ baselineAnalysisId: z.string().min(1), campaignConsent: z.literal(true) });

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return Response.json({ ok: false, error: { code, message, details } }, { status });
}
