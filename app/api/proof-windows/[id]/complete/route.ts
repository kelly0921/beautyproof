import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { apiError, completeWindowSchema } from "@/lib/validation/api";
import { evidenceQuality } from "@/lib/evidence/quality";
import { determineVerdict } from "@/lib/evidence/verdict";
import { rewardEarnedAfterStoredReceipt } from "@/lib/campaigns/rewards";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const { id } = await params;
  const parsed = completeWindowSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_COMPLETION", "ProofWindow completion input is invalid.", 400, parsed.error.flatten());
  const repository = getRepositoryForRequest(request);
  const record = await repository.getWindow(id);
  if (!record) return apiError("PROOF_WINDOW_NOT_FOUND", "The ProofWindow was not found.", 404);
  const existingReceipt = await repository.getReceiptByWindow(record.id);
  if (existingReceipt) {
    const [baseline, followup, campaignCompletion] = await Promise.all([
      repository.getAnalysis(existingReceipt.baselineAnalysisId),
      repository.getAnalysis(existingReceipt.followupAnalysisId),
      record.campaignEnrollmentId ? repository.completeCampaignEnrollment(record.campaignEnrollmentId) : Promise.resolve(null),
    ]);
    return Response.json({ ok: true, data: { proofWindow: record, receipt: existingReceipt, analyses: { baseline, followup }, campaign: campaignCompletion, persistence: repository.mode, idempotent: true } });
  }
  if (record.status !== "active") return apiError("PROOF_WINDOW_NOT_ACTIVE", "Only an active ProofWindow can be completed.", 409);
  const baselineAnalysis = await repository.getAnalysis(record.baselineAnalysisId);
  const followupAnalysis = await repository.getAnalysis(parsed.data.followupAnalysisId);
  if (!baselineAnalysis || !followupAnalysis) return apiError("ANALYSIS_NOT_FOUND", "Both stored baseline and follow-up analyses are required.", 409);
  const protocolElapsed = Date.now() >= Date.parse(`${record.plannedEndDate}T00:00:00.000Z`);
  if (!protocolElapsed && !parsed.data.demoTimeJump) return apiError("PROOF_WINDOW_NOT_READY", "The planned observation window has not elapsed. Use the explicitly labeled demo time jump only for a synthetic prototype receipt.", 409);

  const scenario = parsed.data.scenario;
  const adherenceRate = scenario === "inconclusive" ? 0.54 : 13 / 14;
  const durationComplete = scenario !== "inconclusive";
  const capturesValid = baselineAnalysis.validity.valid && followupAnalysis.validity.valid && scenario !== "inconclusive";
  const quality = evidenceQuality({ exactFormula: true, durationComplete, adherenceRate, routineStable: !parsed.data.majorConfounder, majorConfounder: parsed.data.majorConfounder || scenario === "inconclusive", capturesValid });
  const verdict = determineVerdict({ quality: quality.quality, durationComplete, experience: scenario === "swap" ? "neutral" : parsed.data.experience, primaryMetricDelta: followupAnalysis.metrics.hd_moisture - baselineAnalysis.metrics.hd_moisture, beforeReturnDeadline: true, strongerAlternativeAvailable: scenario === "swap" });
  const sensoryNote = scenario === "swap" ? "Lightweight, but recurring pilling under sunscreen." : scenario === "inconclusive" ? "Neutral; routine changed during the window." : "Lightweight and comfortable; occasional pilling under sunscreen.";
  const receipt = await repository.saveReceipt({
    proofWindowId: record.id,
    baselineAnalysisId: baselineAnalysis.id,
    followupAnalysisId: followupAnalysis.id,
    baseline: baselineAnalysis.metrics,
    followup: followupAnalysis.metrics,
    adherenceRate,
    evidenceQuality: quality.quality,
    evidenceScore: quality.score,
    evidenceReasons: quality.reasons,
    verdict: verdict.verdict,
    verdictExplanation: verdict.explanation,
    experience: scenario === "swap" ? "neutral" : parsed.data.experience,
    sensoryNote,
    origin: parsed.data.demoTimeJump || !protocolElapsed || baselineAnalysis.origin === "synthetic" || followupAnalysis.origin === "synthetic" ? "synthetic" : "real",
  });
  await repository.completeWindow(id);
  const campaignCompletion = record.campaignEnrollmentId && rewardEarnedAfterStoredReceipt({ receiptStored: true, verdict: receipt.verdict, consentToAggregate: receipt.consentToAggregate })
    ? await repository.completeCampaignEnrollment(record.campaignEnrollmentId)
    : null;
  return Response.json({ ok: true, data: { proofWindow: await repository.getWindow(id), receipt, analyses: { baseline: baselineAnalysis, followup: followupAnalysis }, campaign: campaignCompletion, persistence: repository.mode, idempotent: false } });
}
