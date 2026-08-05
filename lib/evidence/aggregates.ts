import type { SyntheticReceipt, Verdict } from "../domain";

const allVerdicts: Verdict[] = ["keep", "swap", "continue", "pause", "return", "inconclusive"];

export function aggregateReceipts(receipts: SyntheticReceipt[], formulaVersionId: string, claimId?: string) {
  const eligible = receipts.filter(
    (receipt) =>
      receipt.formulaVersionId === formulaVersionId &&
      (!claimId || receipt.claimId === claimId) &&
      receipt.consentToAggregate,
  );
  return {
    total: eligible.length,
    byVerdict: Object.fromEntries(allVerdicts.map((verdict) => [verdict, eligible.filter((receipt) => receipt.verdict === verdict).length])) as Record<Verdict, number>,
    byQuality: {
      high: eligible.filter((receipt) => receipt.evidenceQuality === "high").length,
      moderate: eligible.filter((receipt) => receipt.evidenceQuality === "moderate").length,
      limited: eligible.filter((receipt) => receipt.evidenceQuality === "limited").length,
      inconclusive: eligible.filter((receipt) => receipt.evidenceQuality === "inconclusive").length,
    },
    byOrigin: {
      real: eligible.filter((receipt) => receipt.origin === "real").length,
      synthetic: eligible.filter((receipt) => receipt.origin === "synthetic").length,
    },
  };
}
