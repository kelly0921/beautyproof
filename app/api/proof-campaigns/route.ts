import { assertCampaignClaimSupported, CampaignValidationError } from "@/lib/campaigns/claim-guard";
import { getRepository } from "@/lib/data/repository-provider";
import type { ProofCampaign } from "@/lib/domain";
import { claims } from "@/lib/product";
import { apiError, campaignInputSchema } from "@/lib/validation/api";

export async function GET() {
  const repository = getRepository();
  const campaigns = await repository.listCampaigns();
  const coverage = await Promise.all(campaigns.map((campaign) => repository.campaignCoverage(campaign.id)));
  return Response.json({ ok: true, data: { campaigns, coverage, persistence: repository.mode } });
}

export async function POST(request: Request) {
  const parsed = campaignInputSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_PROOF_CAMPAIGN", "Proof Campaign input is invalid.", 400, parsed.error.flatten());
  const now = new Date().toISOString();
  const campaign: ProofCampaign = {
    ...parsed.data,
    id: parsed.data.id ?? `campaign-${crypto.randomUUID()}`,
    createdAt: now,
  };
  if (new Date(campaign.endsAt) <= new Date(campaign.startsAt)) return apiError("INVALID_CAMPAIGN_WINDOW", "The campaign end must be after its start.", 400);
  try {
    assertCampaignClaimSupported(campaign, claims.find((claim) => claim.id === campaign.claimId));
    const saved = await getRepository().saveCampaign(campaign);
    return Response.json({ ok: true, data: saved }, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignValidationError) return apiError(error.code, error.message, 422);
    throw error;
  }
}
