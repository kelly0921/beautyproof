import { CampaignServiceError, freshCampaignEligibility } from "@/lib/campaigns/service";
import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";
import { apiError, campaignEnrollmentSchema } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const { id } = await params;
  const parsed = campaignEnrollmentSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("CAMPAIGN_CONSENT_REQUIRED", "Accept the outcome-neutral campaign terms before enrollment.", 400, parsed.error.flatten());
  const repository = getRepositoryForRequest(request);
  try {
    const { result, analysis } = await freshCampaignEligibility(repository, id, parsed.data.baselineAnalysisId);
    if (!result.eligible) return apiError("CAMPAIGN_INELIGIBLE", "This starting measurement does not match the current campaign evidence gap.", 409, result);
    const enrollment = await repository.createEnrollment({
      campaignId: id,
      userId: analysis.userId,
      baselineAnalysisId: analysis.id,
      eligibility: result,
      campaignConsentAcceptedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true, data: enrollment }, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignServiceError) return apiError(error.code, error.message, 404);
    if (error instanceof Error && ["CAMPAIGN_NOT_ACTIVE", "CAMPAIGN_INELIGIBLE"].includes(error.message)) return apiError(error.message, "The campaign cannot accept this enrollment.", 409);
    throw error;
  }
}
