import type { EvidenceQuality, EvidenceQualityInput, EvidenceQualityResult } from "../domain";

export function evidenceQuality(input: EvidenceQualityInput): EvidenceQualityResult {
  const reasons = [
    { label: "Exact formula confirmed", earned: input.exactFormula, points: input.exactFormula ? 20 : 0 },
    { label: "Claim-aligned duration completed", earned: input.durationComplete, points: input.durationComplete ? 20 : 0 },
    { label: "Adherence met the 80% prototype threshold", earned: input.adherenceRate >= 0.8, points: input.adherenceRate >= 0.8 ? 20 : 0 },
    {
      label: "Routine reasonably stable with no major confounder",
      earned: input.routineStable && !input.majorConfounder,
      points: input.routineStable && !input.majorConfounder ? 20 : 0,
    },
    { label: "Baseline and follow-up captures valid", earned: input.capturesValid, points: input.capturesValid ? 20 : 0 },
  ];
  const score = reasons.reduce((total, reason) => total + reason.points, 0);
  const quality: EvidenceQuality = score >= 80 ? "high" : score >= 60 ? "moderate" : score >= 30 ? "limited" : "inconclusive";
  return { score, quality, reasons };
}

export const qualityLabel: Record<EvidenceQuality, string> = {
  high: "High-confidence personal observation",
  moderate: "Moderate evidence",
  limited: "Limited evidence",
  inconclusive: "Inconclusive",
};
