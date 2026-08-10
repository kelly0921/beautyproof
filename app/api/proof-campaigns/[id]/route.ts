import { assertCampaignClaimSupported, CampaignValidationError } from "@/lib/campaigns/claim-guard";
import { getRepository } from "@/lib/data/repository-provider";
import { claims } from "@/lib/product";
import { apiError, campaignPatchSchema } from "@/lib/validation/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getRepository();
  const campaign = await repository.getCampaign(id);
  if (!campaign) return apiError("CAMPAIGN_NOT_FOUND", "The Proof Campaign was not found.", 404);
  const [brand, coverage] = await Promise.all([repository.getBrand(campaign.brandId), repository.campaignCoverage(id)]);
  return Response.json({ ok: true, data: { campaign, brand, coverage, persistence: repository.mode } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = campaignPatchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_CAMPAIGN_UPDATE", "Proof Campaign update is invalid.", 400, parsed.error.flatten());
  const repository = getRepository();
  const existing = await repository.getCampaign(id);
  if (!existing) return apiError("CAMPAIGN_NOT_FOUND", "The Proof Campaign was not found.", 404);
  const campaign = { ...existing, ...parsed.data };
  if (new Date(campaign.endsAt) <= new Date(campaign.startsAt)) return apiError("INVALID_CAMPAIGN_WINDOW", "The campaign end must be after its start.", 400);
  try {
    if (campaign.status === "active") assertCampaignClaimSupported(campaign, claims.find((claim) => claim.id === campaign.claimId));
    return Response.json({ ok: true, data: await repository.saveCampaign(campaign) });
  } catch (error) {
    if (error instanceof CampaignValidationError) return apiError(error.code, error.message, 422);
    throw error;
  }
}
