import type { ProofCampaign, Verdict } from "../domain";

export const prototypeRewardNote = "Prototype ledger only. Reward depends on protocol completion, not outcome; no funds moved.";

export function rewardEarnedAfterStoredReceipt(input: {
  receiptStored: boolean;
  verdict: Verdict;
  consentToAggregate: boolean;
}) {
  void input.verdict;
  void input.consentToAggregate;
  return input.receiptStored;
}

export function campaignBudgetCents(campaign: ProofCampaign) {
  return campaign.targetReceiptCount * campaign.rewardAmountCents;
}
