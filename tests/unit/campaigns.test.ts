import { describe, expect, it } from "vitest";
import { CampaignValidationError, assertCampaignClaimSupported } from "../../lib/campaigns/claim-guard";
import { calculateCampaignCoverage, matchingSyntheticCampaignReceipts } from "../../lib/campaigns/coverage";
import { evaluateCampaignEligibility } from "../../lib/campaigns/eligibility";
import { cloneHeroCampaign } from "../../lib/campaigns/hero";
import { rewardEarnedAfterStoredReceipt } from "../../lib/campaigns/rewards";
import { demoBaseline, demoFollowups } from "../../lib/demo";
import type { ProofReceiptRecord, RewardLedgerEntry, SkinAnalysis, Verdict } from "../../lib/domain";
import { claims, formulas } from "../../lib/product";
import { seededReceipts } from "../../lib/seed";

function analysis(overrides: Partial<SkinAnalysis> = {}): SkinAnalysis {
  return {
    id: "analysis-campaign-baseline",
    userId: "demo-user",
    capturedAt: "2026-08-10T12:00:00.000Z",
    providerTaskId: "youcam-task-baseline",
    sourceType: "uploaded",
    apiVersion: "v2.1",
    captureMode: "preloaded",
    metrics: demoBaseline,
    uiScores: { ...demoBaseline },
    maskUrls: {},
    validity: { valid: true, shortSide: 1200, lighting: "good" },
    origin: "cached_real_youcam",
    ...overrides,
  };
}

describe("Proof Campaign business rules", () => {
  it("qualifies a verified cached YouCam baseline with an explainable moisture reason", () => {
    const campaign = { ...cloneHeroCampaign(), status: "active" as const };
    const result = evaluateCampaignEligibility({ campaign, analysis: analysis(), claim: claims[0], formula: formulas[1], hasConflictingActiveWindow: false });
    expect(result).toMatchObject({ eligible: true, status: "eligible" });
    expect(result.matchedMetrics.hd_moisture).toMatchObject({ value: 54.2, passed: true });
    expect(result.reasons.find((reason) => reason.code === "METRIC_HD_MOISTURE")?.message).toContain("60 or below");
  });

  it("returns a respectful explainable ineligible result for an out-of-range baseline", () => {
    const campaign = { ...cloneHeroCampaign(), status: "active" as const };
    const result = evaluateCampaignEligibility({ campaign, analysis: analysis({ metrics: { ...demoBaseline, hd_moisture: 72 } }), claim: claims[0], formula: formulas[1], hasConflictingActiveWindow: false });
    expect(result.eligible).toBe(false);
    expect(result.reasons.find((reason) => reason.code === "METRIC_HD_MOISTURE")).toMatchObject({ passed: false });
    expect(result.reasons.map((reason) => reason.message).join(" ")).not.toMatch(/unhealthy|biological|demographic/i);
  });

  it("does not allow a synthetic analysis to qualify", () => {
    const campaign = { ...cloneHeroCampaign(), status: "active" as const };
    const result = evaluateCampaignEligibility({ campaign, analysis: analysis({ origin: "synthetic" }), claim: claims[0], formula: formulas[1], hasConflictingActiveWindow: false });
    expect(result.eligible).toBe(false);
    expect(result.reasons.find((reason) => reason.code === "VALID_PROVENANCE")).toMatchObject({ passed: false });
  });

  it("allows the labeled simulated fixture to exercise the demo without treating it as real", () => {
    const campaign = { ...cloneHeroCampaign(), status: "active" as const };
    const result = evaluateCampaignEligibility({ campaign, analysis: analysis({ origin: "synthetic", sourceType: "cached_demo" }), claim: claims[0], formula: formulas[1], hasConflictingActiveWindow: false });
    expect(result.eligible).toBe(true);
    expect(result.reasons.find((reason) => reason.code === "VALID_PROVENANCE")?.message).toContain("simulated YouCam-format fixture");
  });

  it("blocks an unsupported barrier-repair campaign", () => {
    const campaign = { ...cloneHeroCampaign(), claimId: "claim-barrier-2026" };
    expect(() => assertCampaignClaimSupported(campaign, claims[2])).toThrowError(CampaignValidationError);
  });

  it.each(["keep", "return", "inconclusive"] satisfies Verdict[])("earns the outcome-neutral reward for %s after receipt storage", (verdict) => {
    expect(rewardEarnedAfterStoredReceipt({ receiptStored: true, verdict, consentToAggregate: false })).toBe(true);
  });

  it("keeps formula-2024 records out and separates synthetic from persisted origins", () => {
    const campaign = { ...cloneHeroCampaign(), status: "active" as const };
    const matching = matchingSyntheticCampaignReceipts(campaign, seededReceipts);
    expect(matching.length).toBeGreaterThan(0);
    expect(matching.every((receipt) => receipt.formulaVersionId === "formula-2026-us" && receipt.baseline.hd_moisture <= 60)).toBe(true);
    const receipt: ProofReceiptRecord = {
      id: "receipt-real-campaign",
      proofWindowId: "window-campaign",
      baselineAnalysisId: "analysis-campaign-baseline",
      followupAnalysisId: "analysis-campaign-followup",
      baseline: demoBaseline,
      followup: demoFollowups.keep,
      adherenceRate: 13 / 14,
      evidenceQuality: "high",
      evidenceScore: 100,
      evidenceReasons: [],
      verdict: "keep",
      verdictExplanation: "A conservative personal decision.",
      experience: "good",
      sensoryNote: "Comfortable.",
      consentToAggregate: false,
      origin: "real",
      createdAt: "2026-08-24T12:00:00.000Z",
    };
    const reward: RewardLedgerEntry = {
      id: "reward-real-campaign",
      enrollmentId: "enrollment-real-campaign",
      rewardType: "store_credit",
      rewardAmountCents: 1500,
      currency: "USD",
      status: "earned",
      earnedAt: "2026-08-24T12:00:00.000Z",
      note: "Prototype ledger; no funds moved.",
    };
    const coverage = calculateCampaignCoverage({ campaign, syntheticReceipts: seededReceipts, persistedReceipts: [{ receipt, baselineOrigin: "cached_real_youcam", baselineSourceType: "uploaded", reward }] });
    expect(coverage.completedReceiptCount).toBe(matching.length + 1);
    expect(coverage.originCounts).toMatchObject({ synthetic: matching.length, simulatedDemo: 0, real: 1, cachedRealYouCam: 1, liveYouCam: 0 });
    expect(coverage.earnedRewardCount).toBe(1);
    expect(coverage.earnedRewardCents).toBe(1500);
  });

  it("counts a completed simulated judge run as synthetic rather than real evidence", () => {
    const campaign = { ...cloneHeroCampaign(), status: "active" as const };
    const matching = matchingSyntheticCampaignReceipts(campaign, seededReceipts);
    const receipt: ProofReceiptRecord = {
      id: "receipt-demo-campaign",
      proofWindowId: "window-demo",
      baselineAnalysisId: "analysis-demo-baseline",
      followupAnalysisId: "analysis-demo-followup",
      baseline: demoBaseline,
      followup: demoFollowups.keep,
      adherenceRate: 13 / 14,
      evidenceQuality: "high",
      evidenceScore: 100,
      evidenceReasons: [],
      verdict: "keep",
      verdictExplanation: "A simulated demonstration receipt.",
      experience: "good",
      sensoryNote: "Simulated.",
      consentToAggregate: true,
      origin: "synthetic",
      createdAt: "2026-08-24T12:00:00.000Z",
    };
    const coverage = calculateCampaignCoverage({ campaign, syntheticReceipts: seededReceipts, persistedReceipts: [{ receipt, baselineOrigin: "synthetic", baselineSourceType: "cached_demo" }] });
    expect(coverage.completedReceiptCount).toBe(matching.length + 1);
    expect(coverage.originCounts).toMatchObject({ synthetic: matching.length + 1, simulatedDemo: 1, real: 0, cachedRealYouCam: 0, liveYouCam: 0 });
  });

  it("does not count live analyses as real completed evidence when the receipt used a demo protocol", () => {
    const campaign = { ...cloneHeroCampaign(), status: "active" as const };
    const matching = matchingSyntheticCampaignReceipts(campaign, seededReceipts);
    const receipt: ProofReceiptRecord = {
      id: "receipt-live-demo-protocol",
      proofWindowId: "window-live-demo-protocol",
      baselineAnalysisId: "analysis-live-baseline",
      followupAnalysisId: "analysis-live-followup",
      baseline: demoBaseline,
      followup: demoFollowups.keep,
      adherenceRate: 13 / 14,
      evidenceQuality: "high",
      evidenceScore: 100,
      evidenceReasons: [],
      verdict: "keep",
      verdictExplanation: "Live measurements with a simulated duration.",
      experience: "good",
      sensoryNote: "Demo protocol.",
      consentToAggregate: false,
      origin: "synthetic",
      createdAt: "2026-08-10T12:00:00.000Z",
    };
    const coverage = calculateCampaignCoverage({ campaign, syntheticReceipts: seededReceipts, persistedReceipts: [{ receipt, baselineOrigin: "live_youcam", baselineSourceType: "uploaded" }] });
    expect(coverage.originCounts).toMatchObject({ synthetic: matching.length + 1, simulatedDemo: 1, real: 0, liveYouCam: 0 });
  });
});
