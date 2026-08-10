import { notFound } from "next/navigation";
import { CampaignDemoStart } from "@/components/campaigns/campaign-demo-start";
import { getRepository } from "@/lib/data/repository-provider";
import { aggregateReceipts } from "@/lib/evidence/aggregates";
import { seededReceipts } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const repository = getRepository();
  const campaign = await repository.getCampaign("campaign-dewsignal-hydration-2026");
  if (!campaign) notFound();
  const coverage = await repository.campaignCoverage(campaign.id);
  if (!coverage) notFound();
  const historicalCount = aggregateReceipts(seededReceipts, "formula-2024-original", campaign.claimId).total;
  const currentCount = aggregateReceipts(seededReceipts, campaign.formulaVersionId, campaign.claimId).total;
  return <CampaignDemoStart campaign={campaign} coverage={coverage} currentCount={currentCount} historicalCount={historicalCount} />;
}
