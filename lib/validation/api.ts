import { z } from "zod";

export const scenarioSchema = z.enum(["keep", "swap", "inconclusive"]);
export const taskRequestSchema = z.object({ kind: z.enum(["baseline", "followup"]), scenario: scenarioSchema.default("keep"), allowCachedFallback: z.boolean().default(true) });
export const windowSchema = z.object({ formulaVersionId: z.literal("formula-2026-us"), claimId: z.literal("claim-hydration-2026"), baselineAnalysisId: z.string().min(1), startDate: z.string().date(), plannedEndDate: z.string().date(), returnDeadline: z.string().date(), status: z.literal("active") });
export const checkInSchema = z.object({ date: z.string().date(), usedProduct: z.boolean(), experience: z.enum(["good", "neutral", "concern"]), confounderNote: z.string().max(400).optional() });
export const completeWindowSchema = z.object({
  scenario: scenarioSchema.default("keep"),
  followupAnalysisId: z.string().min(1),
  experience: z.enum(["good", "neutral", "concern"]).default("neutral"),
  majorConfounder: z.boolean().default(false),
});
export const consentSchema = z.object({ consent: z.literal(true) });

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return Response.json({ ok: false, error: { code, message, details } }, { status });
}
