import { notFound } from "next/navigation";
import { CampaignOpportunityFlow } from "@/components/campaigns/campaign-opportunity-flow";
import { getRepository } from "@/lib/data/repository-provider";

export const dynamic = "force-dynamic";

export default async function CampaignOpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ scenario?: string; demo?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const campaign = await getRepository().getCampaign(id);
  if (!campaign) notFound();
  const scenario = ["keep", "swap", "inconclusive"].includes(query.scenario ?? "") ? query.scenario as "keep" | "swap" | "inconclusive" : "keep";
  return <CampaignOpportunityFlow campaign={campaign} demoMode={query.demo === "1"} scenario={scenario} />;
}
