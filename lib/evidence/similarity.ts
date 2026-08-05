import type { ClaimDefinition, MetricVector, SyntheticReceipt } from "../domain";

export interface ComparableReceipt {
  receipt: SyntheticReceipt;
  distance: number;
  reasons: string[];
}

const defaultWeights: Record<keyof MetricVector, number> = {
  hd_moisture: 0.5,
  hd_redness: 0.2,
  hd_texture: 0.15,
  hd_oiliness: 0.15,
};

export function weightedDistance(
  left: MetricVector,
  right: MetricVector,
  weights: Partial<Record<keyof MetricVector, number>> = defaultWeights,
) {
  const entries = Object.entries(weights) as [keyof MetricVector, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  const squared = entries.reduce((sum, [metric, weight]) => {
    const normalizedDelta = (left[metric] - right[metric]) / 99;
    return sum + weight * normalizedDelta * normalizedDelta;
  }, 0);
  return Math.sqrt(squared / totalWeight);
}

export function findComparableReceipts(args: {
  baseline: MetricVector;
  formulaVersionId: string;
  claim: ClaimDefinition;
  receipts: SyntheticReceipt[];
  limit?: number;
  threshold?: number;
  minimumCohort?: number;
}) {
  const { baseline, formulaVersionId, claim, receipts, limit = 8, threshold = 0.28, minimumCohort = 5 } = args;
  const comparables = receipts
    .filter(
      (receipt) =>
        receipt.formulaVersionId === formulaVersionId &&
        receipt.claimId === claim.id &&
        receipt.consentToAggregate &&
        receipt.evidenceQuality !== "inconclusive",
    )
    .map((receipt): ComparableReceipt => {
      const distance = weightedDistance(baseline, receipt.baseline, claim.weights);
      const reasons = ["Same exact 2026 US formula", "Same hydration claim"];
      if (Math.abs(baseline.hd_moisture - receipt.baseline.hd_moisture) <= 10) {
        reasons.push("Moisture started in a comparable range");
      }
      if (Math.abs(baseline.hd_redness - receipt.baseline.hd_redness) <= 12) {
        reasons.push("Redness context is comparable");
      }
      return { receipt, distance, reasons };
    })
    .filter((entry) => entry.distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return {
    comparables,
    scarcity: comparables.length < minimumCohort,
    explanation:
      "These trials tested the same formula and hydration claim, and began within comparable ranges for moisture, redness, texture, and oiliness.",
  };
}
