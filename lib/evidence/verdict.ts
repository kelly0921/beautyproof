import type { VerdictInput } from "../domain";

export function determineVerdict(input: VerdictInput) {
  if (input.experience === "concern") {
    return { verdict: "pause" as const, explanation: "You reported a concern. Pause this personal observation and follow the product label or seek appropriate professional guidance if needed." };
  }
  if (input.quality === "inconclusive") {
    return { verdict: "inconclusive" as const, explanation: "The available observation quality is not sufficient for a responsible personal decision." };
  }
  if (!input.durationComplete) {
    return { verdict: "continue" as const, explanation: "The claim-aligned observation period is not complete and no concern was reported." };
  }
  if (input.primaryMetricDelta <= -4) {
    return {
      verdict: input.beforeReturnDeadline ? (input.strongerAlternativeAvailable ? "swap" as const : "return" as const) : "swap" as const,
      explanation: "The primary raw-score observation moved against the selected claim beyond the configured prototype threshold.",
    };
  }
  if (input.primaryMetricDelta >= 3) {
    return { verdict: "keep" as const, explanation: "The primary observation improved during a completed, usable trial and the sensory experience was acceptable." };
  }
  if (input.strongerAlternativeAvailable) {
    return { verdict: "swap" as const, explanation: "This result was weak, while an alternative has stronger relevant ProofReceipts for comparable starting measurements." };
  }
  return { verdict: "inconclusive" as const, explanation: "The observed change was too small for this prototype heuristic to support a keep or swap decision." };
}
