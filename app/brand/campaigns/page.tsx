import Link from "next/link";
import { getRepository } from "@/lib/data/repository-provider";

export const dynamic = "force-dynamic";

export default async function BrandCampaignsPage() {
  const repository = getRepository();
  const campaigns = await repository.listCampaigns();
  const cards = await Promise.all(campaigns.map(async (campaign) => ({ campaign, coverage: await repository.campaignCoverage(campaign.id) })));
  return <main className="campaign-page"><header className="campaign-index-heading"><div><p className="eyebrow">BeautyProof for brands</p><h1>Fund the evidence gap.<br />Never the verdict.</h1></div><p>Proof Campaigns turn customer acquisition from buying attention into funding reusable, formula-specific evidence.</p></header><div className="campaign-index-grid">{cards.map(({ campaign, coverage }) => <Link className="campaign-index-card" href={`/brand/campaigns/${campaign.id}`} key={campaign.id}><div><span className={`campaign-status campaign-status-${campaign.status}`}>{campaign.status}</span><span>Aster Vale · DewSignal</span></div><h2>{campaign.title}</h2><p>{campaign.purpose}</p><div className="campaign-index-progress"><i style={{ width: `${(coverage?.completionRate ?? 0) * 100}%` }} /></div><footer><strong>{coverage?.completedReceiptCount ?? 0} / {campaign.targetReceiptCount}</strong><span>{campaign.rewardLabel} · outcome neutral</span><b>›</b></footer></Link>)}</div></main>;
}
