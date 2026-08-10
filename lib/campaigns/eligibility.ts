import type { CampaignEligibilityResult, ClaimDefinition, FormulaVersion, ProofCampaign, SkinAnalysis, SkinMetric } from "../domain";
import { canExerciseDemoCampaign, isSimulatedDemoAnalysis } from "../provenance";

interface EligibilityInput {
  campaign: ProofCampaign;
  analysis: SkinAnalysis;
  claim?: ClaimDefinition;
  formula?: FormulaVersion;
  hasConflictingActiveWindow: boolean;
}

function inRange(value: number, range: { min?: number; max?: number }) {
  return (range.min === undefined || value >= range.min) && (range.max === undefined || value <= range.max);
}

function rangeLabel(range: { min?: number; max?: number }) {
  if (range.max !== undefined && range.min === undefined) return `${range.max} or below`;
  if (range.min !== undefined && range.max === undefined) return `${range.min} or above`;
  return `${range.min} to ${range.max}`;
}

export function evaluateCampaignEligibility(input: EligibilityInput): CampaignEligibilityResult {
  const observableClaim = Boolean(input.claim && ["youcam_observable", "observable_plus_subjective"].includes(input.claim.type));
  const validProvenance = canExerciseDemoCampaign(input.analysis);
  const simulatedDemo = isSimulatedDemoAnalysis(input.analysis);
  const reasons: CampaignEligibilityResult["reasons"] = [
    {
      code: "CAMPAIGN_ACTIVE",
      message: input.campaign.status === "active" ? "This Proof Campaign is active." : "This Proof Campaign is not currently active.",
      passed: input.campaign.status === "active",
    },
    {
      code: "EXACT_FORMULA_CLAIM",
      message: input.formula && input.claim && input.formula.id === input.campaign.formulaVersionId && input.claim.id === input.campaign.claimId
        ? "The campaign is locked to the exact 2026 formula and hydration claim."
        : "The exact campaign formula or claim is no longer available.",
      passed: Boolean(input.formula && input.claim && input.formula.id === input.campaign.formulaVersionId && input.claim.id === input.campaign.claimId),
    },
    {
      code: "OBSERVABLE_CLAIM",
      message: observableClaim ? "The selected claim can be responsibly observed with YouCam raw scores." : "This claim cannot support a measured Proof Campaign.",
      passed: observableClaim,
    },
    {
      code: "VALID_ANALYSIS",
      message: input.analysis.validity.valid ? "The starting analysis passed the capture validity check." : "A valid starting analysis is required.",
      passed: input.analysis.validity.valid,
    },
    {
      code: "VALID_PROVENANCE",
      message: simulatedDemo
        ? "This simulated YouCam-format fixture may exercise the judge flow, but it will remain synthetic and never count as real user evidence."
        : validProvenance
          ? "The starting measurement has verified live or cached YouCam provenance."
          : "Unverified synthetic analyses cannot enroll in a Proof Campaign.",
      passed: validProvenance,
    },
  ];
  const matchedMetrics: CampaignEligibilityResult["matchedMetrics"] = {};
  for (const [metric, range] of Object.entries(input.campaign.targetMetricRanges) as [SkinMetric, { min?: number; max?: number }][]) {
    if (!range) continue;
    const value = input.analysis.metrics[metric];
    const passed = inRange(value, range);
    matchedMetrics[metric] = { value, range, passed };
    reasons.push({
      code: `METRIC_${metric.toUpperCase()}`,
      message: passed
        ? `Your starting moisture raw score is ${value.toFixed(1)}, within this campaign's target range of ${rangeLabel(range)}. The campaign tests the exact 2026 formula and hydration claim.`
        : `Your current starting measurement does not match this specific campaign's evidence gap (${rangeLabel(range)}).`,
      passed,
    });
  }
  reasons.push({
    code: "TRIAL_READY",
    message: input.hasConflictingActiveWindow ? "Finish or withdraw from the active ProofWindow before starting another." : "No conflicting active ProofWindow was found.",
    passed: !input.hasConflictingActiveWindow,
  });
  const eligible = reasons.every((reason) => reason.passed);
  return {
    campaignId: input.campaign.id,
    analysisId: input.analysis.id,
    status: eligible ? "eligible" : "ineligible",
    eligible,
    reasons,
    matchedMetrics,
  };
}
