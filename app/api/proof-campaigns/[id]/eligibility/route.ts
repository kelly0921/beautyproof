import { CampaignServiceError, freshCampaignEligibility } from "@/lib/campaigns/service";
import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";
import { apiError, campaignEligibilitySchema } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const { id } = await params;
  const parsed = campaignEligibilitySchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_ELIGIBILITY_REQUEST", "A stored baseline analysis is required.", 400, parsed.error.flatten());
  try {
    const { result } = await freshCampaignEligibility(getRepositoryForRequest(request), id, parsed.data.baselineAnalysisId);
    return Response.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof CampaignServiceError) return apiError(error.code, error.message, 404);
    throw error;
  }
}
