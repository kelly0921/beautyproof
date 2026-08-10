import type { Brand, ProofCampaign } from "../domain";

export const asterValeBrand: Brand = {
  id: "brand-aster-vale",
  slug: "aster-vale",
  name: "Aster Vale",
  description: "A fictional prestige skincare brand used to demonstrate formula-specific Proof Campaigns.",
};

export const heroCampaign: ProofCampaign = {
  id: "campaign-dewsignal-hydration-2026",
  brandId: asterValeBrand.id,
  formulaVersionId: "formula-2026-us",
  claimId: "claim-hydration-2026",
  title: "DewSignal 2026 Hydration Proof Campaign",
  purpose: "Close the current-formula hydration evidence gap for shoppers starting with a moisture raw score of 60 or below.",
  status: "draft",
  targetReceiptCount: 25,
  targetMetricRanges: { hd_moisture: { max: 60 } },
  requiredDurationDays: 14,
  rewardType: "store_credit",
  rewardAmountCents: 1500,
  rewardLabel: "$15 Aster Vale store credit",
  currency: "USD",
  outcomeNeutral: true,
  startsAt: "2026-08-04T00:00:00.000Z",
  endsAt: "2026-09-30T23:59:59.000Z",
  createdAt: "2026-08-04T00:00:00.000Z",
};

export function cloneHeroCampaign(): ProofCampaign {
  return {
    ...heroCampaign,
    targetMetricRanges: {
      hd_moisture: { ...heroCampaign.targetMetricRanges.hd_moisture },
    },
  };
}
