import { getRepository } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";
import { apiError, windowSchema } from "@/lib/validation/api";

export async function POST(request: Request) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const parsed = windowSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_PROOF_WINDOW", "ProofWindow input is invalid.", 400, parsed.error.flatten());
  const repository = getRepository();
  try {
    if (parsed.data.campaignEnrollmentId) {
      const [enrollment, baseline, windows] = await Promise.all([
        repository.getEnrollment(parsed.data.campaignEnrollmentId),
        repository.getAnalysis(parsed.data.baselineAnalysisId),
        repository.listWindows(),
      ]);
      if (!enrollment) return apiError("CAMPAIGN_ENROLLMENT_NOT_FOUND", "Enroll in the Proof Campaign before starting its ProofWindow.", 404);
      const campaign = await repository.getCampaign(enrollment.campaignId);
      const enrollmentMatches = Boolean(
        campaign
        && campaign.status === "active"
        && enrollment.eligibility.eligible
        && ["enrolled", "active"].includes(enrollment.status)
        && baseline
        && baseline.userId === enrollment.userId
        && enrollment.baselineAnalysisId === parsed.data.baselineAnalysisId
        && campaign.formulaVersionId === parsed.data.formulaVersionId
        && campaign.claimId === parsed.data.claimId,
      );
      if (!enrollmentMatches) return apiError("CAMPAIGN_ENROLLMENT_MISMATCH", "The enrollment must match the active campaign, user, formula, claim, and starting analysis.", 409);
      if (windows.some((window) => window.campaignEnrollmentId === enrollment.id)) return apiError("CAMPAIGN_ENROLLMENT_ALREADY_LINKED", "This enrollment already has a ProofWindow.", 409);
    }
    const record = await repository.createWindow(parsed.data);
    const linked = parsed.data.campaignEnrollmentId
      ? await repository.linkWindowToEnrollment(record.id, parsed.data.campaignEnrollmentId)
      : record;
    return Response.json({ ok: true, data: linked ?? record }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "BASELINE_ANALYSIS_NOT_FOUND") return apiError("BASELINE_ANALYSIS_NOT_FOUND", "Create a stored baseline analysis before starting a ProofWindow.", 409);
    if (error instanceof Error && error.message === "CAMPAIGN_ENROLLMENT_ALREADY_LINKED") return apiError(error.message, "This enrollment already has a ProofWindow.", 409);
    throw error;
  }
}
