import type { ProofCampaign, Verdict } from "../domain";

export const prototypeRewardNote = "Prototype ledger only. Reward depends on protocol completion, not outcome; no funds moved.";

export function rewardEarnedAfterStoredReceipt(input: {
  receiptStored: boolean;
  protocolValid: boolean;
  verdict: Verdict;
  consentToAggregate: boolean;
}) {
  void input.verdict;
  void input.consentToAggregate;
  return input.receiptStored && input.protocolValid;
}

export function protocolEligibleForReward(input: {
  durationComplete: boolean;
  adherenceRate: number;
  capturesValid: boolean;
  checkInRecorded: boolean;
}) {
  return input.durationComplete && input.adherenceRate >= 0.8 && input.capturesValid && input.checkInRecorded;
}

export function campaignBudgetCents(campaign: ProofCampaign) {
  return campaign.targetReceiptCount * campaign.rewardAmountCents;
}
