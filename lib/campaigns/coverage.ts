import type {
  AnalysisOrigin,
  CampaignCoverage,
  EvidenceQuality,
  ProofCampaign,
  ProofReceiptRecord,
  RewardLedgerEntry,
  SyntheticReceipt,
  Verdict,
} from "../domain";

export interface PersistedCampaignReceipt {
  receipt: ProofReceiptRecord;
  baselineOrigin: AnalysisOrigin;
  baselineSourceType?: "live" | "uploaded" | "cached_demo";
  reward?: RewardLedgerEntry;
}

const verdicts: Verdict[] = ["keep", "swap", "continue", "pause", "return", "inconclusive"];
const qualities: EvidenceQuality[] = ["high", "moderate", "limited", "inconclusive"];

function metricMatches(campaign: ProofCampaign, receipt: Pick<SyntheticReceipt, "baseline">) {
  return Object.entries(campaign.targetMetricRanges).every(([metric, range]) => {
    if (!range) return true;
    const value = receipt.baseline[metric as keyof typeof receipt.baseline];
    return (range.min === undefined || value >= range.min) && (range.max === undefined || value <= range.max);
  });
}

export function matchingSyntheticCampaignReceipts(campaign: ProofCampaign, receipts: SyntheticReceipt[]) {
  return receipts.filter((receipt) =>
    receipt.formulaVersionId === campaign.formulaVersionId
    && receipt.claimId === campaign.claimId
    && metricMatches(campaign, receipt),
  );
}

export function calculateCampaignCoverage(input: {
  campaign: ProofCampaign;
  syntheticReceipts: SyntheticReceipt[];
  persistedReceipts: PersistedCampaignReceipt[];
}): CampaignCoverage {
  const synthetic = matchingSyntheticCampaignReceipts(input.campaign, input.syntheticReceipts);
  const persisted = input.persistedReceipts.filter(({ receipt }) => metricMatches(input.campaign, receipt));
  const all = [...synthetic, ...persisted.map(({ receipt }) => receipt)];
  const verdictCounts = Object.fromEntries(verdicts.map((verdict) => [verdict, 0])) as Record<Verdict, number>;
  const evidenceQualityCounts = Object.fromEntries(qualities.map((quality) => [quality, 0])) as Record<EvidenceQuality, number>;
  for (const receipt of all) {
    verdictCounts[receipt.verdict] += 1;
    evidenceQualityCounts[receipt.evidenceQuality] += 1;
  }
  const earnedRewards = persisted
    .map(({ reward }) => reward)
    .filter((reward): reward is RewardLedgerEntry => Boolean(reward && reward.status !== "pending"));
  const liveYouCam = persisted.filter(({ receipt, baselineOrigin }) => receipt.origin === "real" && baselineOrigin === "live_youcam").length;
  const cachedRealYouCam = persisted.filter(({ receipt, baselineOrigin }) => receipt.origin === "real" && baselineOrigin === "cached_real_youcam").length;
  const persistedSynthetic = persisted.filter(({ receipt }) => receipt.origin === "synthetic").length;
  const simulatedDemo = persisted.filter(({ receipt }) => receipt.origin === "synthetic").length;
  const real = liveYouCam + cachedRealYouCam;
  const completedReceiptCount = all.length;
  return {
    campaignId: input.campaign.id,
    targetReceiptCount: input.campaign.targetReceiptCount,
    completedReceiptCount,
    remainingGap: Math.max(0, input.campaign.targetReceiptCount - completedReceiptCount),
    completionRate: Math.min(1, completedReceiptCount / input.campaign.targetReceiptCount),
    verdictCounts,
    evidenceQualityCounts,
    originCounts: {
      real,
      synthetic: synthetic.length + persistedSynthetic,
      simulatedDemo,
      liveYouCam,
      cachedRealYouCam,
    },
    earnedRewardCount: earnedRewards.length,
    earnedRewardCents: earnedRewards.reduce((sum, reward) => sum + reward.rewardAmountCents, 0),
  };
}
