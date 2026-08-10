import type { ClaimDefinition, ProofCampaign } from "../domain";

export class CampaignValidationError extends Error {
  constructor(public readonly code: "CAMPAIGN_CLAIM_UNSUPPORTED" | "CAMPAIGN_CLAIM_MISMATCH", message: string) {
    super(message);
  }
}

export function assertCampaignClaimSupported(campaign: ProofCampaign, claim?: ClaimDefinition) {
  if (!claim || claim.id !== campaign.claimId || claim.formulaVersionId !== campaign.formulaVersionId) {
    throw new CampaignValidationError("CAMPAIGN_CLAIM_MISMATCH", "The campaign must use an existing claim from the exact selected formula.");
  }
  if (!["youcam_observable", "observable_plus_subjective"].includes(claim.type) || !claim.primaryMetric) {
    throw new CampaignValidationError(
      "CAMPAIGN_CLAIM_UNSUPPORTED",
      "Barrier repair and subjective-only claims cannot launch a measured Proof Campaign because facial image analysis does not responsibly observe them.",
    );
  }
}
