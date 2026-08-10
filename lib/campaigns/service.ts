import type { BeautyProofRepository } from "../data/repository";
import { claims, formulas } from "../product";
import { evaluateCampaignEligibility } from "./eligibility";

export class CampaignServiceError extends Error {
  constructor(public readonly code: "CAMPAIGN_NOT_FOUND" | "ANALYSIS_NOT_FOUND", message: string) {
    super(message);
  }
}

export async function freshCampaignEligibility(repository: BeautyProofRepository, campaignId: string, analysisId: string) {
  const [campaign, analysis, windows] = await Promise.all([
    repository.getCampaign(campaignId),
    repository.getAnalysis(analysisId),
    repository.listWindows(),
  ]);
  if (!campaign) throw new CampaignServiceError("CAMPAIGN_NOT_FOUND", "The Proof Campaign was not found.");
  if (!analysis) throw new CampaignServiceError("ANALYSIS_NOT_FOUND", "Create a stored YouCam starting analysis before checking eligibility.");
  const claim = claims.find((entry) => entry.id === campaign.claimId);
  const formula = formulas.find((entry) => entry.id === campaign.formulaVersionId);
  const activeWindows = windows.filter((window) => window.status === "active");
  const conflicts = (await Promise.all(activeWindows.map(async (window) => {
    const baseline = await repository.getAnalysis(window.baselineAnalysisId);
    return baseline?.userId === analysis.userId;
  }))).some(Boolean);
  return {
    campaign,
    analysis,
    result: evaluateCampaignEligibility({ campaign, analysis, claim, formula, hasConflictingActiveWindow: conflicts }),
  };
}
