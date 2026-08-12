import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignActivationButton } from "@/components/campaigns/campaign-activation-button";
import { DemoProgress } from "@/components/campaigns/demo-progress";
import { campaignBudgetCents } from "@/lib/campaigns/rewards";
import { getRepository } from "@/lib/data/repository-provider";
import { aggregateReceipts } from "@/lib/evidence/aggregates";
import { claims, formulas } from "@/lib/product";
import { seededReceipts } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function BrandCampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string; demo?: string }> }) {
  const { id } = await params;
  const { updated, demo } = await searchParams;
  const demoMode = demo === "1";
  const repository = getRepository();
  const campaign = await repository.getCampaign(id);
  if (!campaign) notFound();
  const [brand, coverage, publicContributions] = await Promise.all([
    repository.getBrand(campaign.brandId),
    repository.campaignCoverage(id),
    repository.listPublicContributions(),
  ]);
  if (!brand || !coverage) notFound();
  const publicCampaignReceipts = publicContributions.filter((contribution) => contribution.campaignId === id).map((contribution) => contribution.receipt);
  const publicProofMapRealCount = publicCampaignReceipts.filter((receipt) => receipt.origin === "real").length;
  const publicProofMapDemoCount = publicCampaignReceipts.filter((receipt) => receipt.origin === "synthetic").length;
  const historical = aggregateReceipts(seededReceipts, "formula-2024-original", campaign.claimId);
  const current = aggregateReceipts(seededReceipts, campaign.formulaVersionId, campaign.claimId);
  return <main className={`campaign-page ${demoMode ? "guided-brand-result-page" : ""}`}>
    {demoMode ? <>
      <DemoProgress activeStep={6} detail="The completed receipt now closes part of the exact formula-and-claim evidence gap." role="brand" title="See the coverage increase" />
      <section className="guided-final-stage">
        <header><div><span className="guided-screen-number">06</span><div><p>Brand workspace</p><span>Campaign updated</span></div></div><h1>{publicProofMapDemoCount ? "One simulated trial showed how proof becomes reusable." : "One completed trial became reusable proof."}</h1><p>{publicProofMapDemoCount ? "The prototype reward was earned regardless of outcome. The receipt remains synthetic while demonstrating the separate shopper-consent boundary." : "The consumer earned the same reward regardless of outcome. With separate consent, the receipt also helps the next shopper."}</p></header>
        {updated ? <div className="campaign-update-toast">Campaign coverage updated: the completed sponsored ProofReceipt is included below with its origin attached.</div> : null}
        <div className="guided-final-grid">
          <section className="guided-final-coverage">
            <div className="guided-final-count"><span>Current-formula campaign coverage</span><strong>{coverage.completedReceiptCount} <i>/ {coverage.targetReceiptCount}</i></strong><small>{coverage.remainingGap} receipts remain</small></div>
            <div className="campaign-progress-large"><i style={{ width: `${coverage.completionRate * 100}%` }} /></div>
            <div className="guided-final-stats"><div><span>Rewards earned</span><strong>{coverage.earnedRewardCount}</strong><small>${(coverage.earnedRewardCents / 100).toFixed(0)} prototype ledger</small></div><div><span>Verified evidence</span><strong>{coverage.originCounts.real}</strong><small>live / verified cached</small></div><div><span>Shopper ProofMap</span><strong>{publicProofMapRealCount} real · {publicProofMapDemoCount} demo</strong><small>origin remains attached</small></div></div>
          </section>
          <aside className="guided-final-policy"><span>Outcome-neutral by design</span><h2>The brand funded completion—not a positive verdict.</h2><p>Formula, claim, starting range, adherence, evidence quality, provenance, and limitations stay attached to the receipt.</p><div><Link className="guided-primary-action" href="/demo">Run the demo again <span>↻</span></Link><Link href={`/brand/campaigns/${campaign.id}`}>Open full campaign dashboard →</Link></div></aside>
        </div>
      </section>
    </> : <>
    <Link className="campaign-back-link" href="/brand/campaigns">← All campaigns</Link>
    {updated ? <div className="campaign-update-toast">Campaign coverage updated: the completed sponsored ProofReceipt is included below. Shopper ProofMap contribution remains a separate consent action.</div> : null}
    <section className="brand-campaign-header"><div><p className="eyebrow">{brand.name} · fictional demo brand · Proof Campaign</p><h1>The formula changed.<br /><em>The proof gap reopened.</em></h1><p>{campaign.purpose}</p><CampaignActivationButton campaignId={campaign.id} status={campaign.status} /></div><aside><span>Brands pay for</span><strong>proof, not praise.</strong><p>Rewards depend on completing the protocol—not on a positive result.</p></aside></section>
    <section className="brand-campaign-spec"><div><span>Formula</span><strong>{formulas.find((formula) => formula.id === campaign.formulaVersionId)?.versionLabel}</strong></div><div><span>Claim</span><strong>{claims.find((claim) => claim.id === campaign.claimId)?.text}</strong></div><div><span>Starting range</span><strong>hd_moisture ≤ 60</strong></div><div><span>Duration</span><strong>{campaign.requiredDurationDays} days</strong></div><div><span>Reward</span><strong>{campaign.rewardLabel}</strong></div><div><span>Prototype budget</span><strong>${(campaignBudgetCents(campaign) / 100).toLocaleString()}</strong></div></section>
    <section className="brand-formula-gap"><div><p className="eyebrow">Formula Reset</p><h2>Evidence stays attached to the formula that earned it.</h2><p>{historical.total} historical receipts remain inspectable but cannot count toward the 2026 hydration campaign.</p></div><div className="campaign-reset-counts"><div><span>Historical · excluded</span><strong>{historical.total}</strong><small>{formulas[0].versionLabel}</small></div><div className="current"><span>Current seed evidence</span><strong>{current.total}</strong><small>{formulas[1].versionLabel}</small></div></div></section>
    <section className="brand-claim-boundaries"><header><p className="eyebrow">Claim Compiler</p><h2>Measurement boundaries are campaign controls.</h2></header><div>{claims.map((claim) => <article key={claim.id}><span>{claim.type === "youcam_observable" ? "Eligible measurement" : claim.type === "subjective" ? "Subjective only" : "Launch blocked"}</span><h3>{claim.text}</h3><p>{claim.explanation}</p></article>)}</div></section>
    <section className="campaign-coverage-panel"><header><div><p className="eyebrow">Current-formula Campaign Proof Coverage</p><h2>{coverage.completedReceiptCount} of {coverage.targetReceiptCount}</h2><p>{coverage.remainingGap} receipts remain in this evidence gap.</p></div><div className="campaign-coverage-ring" style={{ "--campaign-progress": `${coverage.completionRate * 100}%` } as React.CSSProperties}><strong>{Math.round(coverage.completionRate * 100)}%</strong></div></header><div className="campaign-progress-large"><i style={{ width: `${coverage.completionRate * 100}%` }} /></div><div className="campaign-coverage-grid"><div><span>Origin disclosure</span><strong>{coverage.originCounts.synthetic} synthetic / demo</strong><small>{coverage.originCounts.real} verified live / cached · {coverage.originCounts.simulatedDemo} simulated run</small></div><div><span>Rewards earned</span><strong>{coverage.earnedRewardCount}</strong><small>${(coverage.earnedRewardCents / 100).toFixed(0)} prototype ledger · no funds moved</small></div><div><span>Evidence quality</span><strong>{coverage.evidenceQualityCounts.high} high</strong><small>{coverage.evidenceQualityCounts.moderate} moderate · {coverage.evidenceQualityCounts.limited} limited · {coverage.evidenceQualityCounts.inconclusive} inconclusive</small></div><div><span>Shopper ProofMap</span><strong>{publicProofMapRealCount} real · {publicProofMapDemoCount} demo</strong><small>Updates only after separate consent; origin never changes</small></div></div><div className="campaign-verdict-distribution">{Object.entries(coverage.verdictCounts).map(([verdict, count]) => <div key={verdict}><span>{verdict}</span><i><b style={{ width: `${coverage.completedReceiptCount ? count / coverage.completedReceiptCount * 100 : 0}%` }} /></i><strong>{count}</strong></div>)}</div></section>
    <section className="campaign-policy-card"><div><p className="eyebrow">Policy lock</p><h2>Completion is rewarded. Positivity is not.</h2></div><p>Campaign-level de-identified outcomes update this coverage under campaign participation terms. A receipt enters the broader shopper ProofMap only after separate consumer consent.</p><Link className="secondary-button" href={`/app/campaigns/${campaign.id}`}>View consumer opportunity →</Link></section>
    </>}
  </main>;
}
