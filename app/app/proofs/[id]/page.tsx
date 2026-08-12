import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptConsentButton } from "@/components/app/receipt-consent-button";
import { DemoProgress } from "@/components/campaigns/demo-progress";
import { getRequestRepository } from "@/lib/data/repository-provider";
import { product } from "@/lib/product";
import { analysisOriginLabel } from "@/lib/provenance";

export const dynamic = "force-dynamic";

const metricNames = { hd_moisture: "Moisture", hd_redness: "Redness", hd_texture: "Texture", hd_oiliness: "Oiliness" };

export default async function AppProofDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ demo?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const demoMode = query.demo === "1";
  const repository = await getRequestRepository();
  const receipt = await repository.getReceipt(id);
  if (!receipt) notFound();
  const proofWindow = await repository.getWindow(receipt.proofWindowId);
  const [baseline, followup] = await Promise.all([repository.getAnalysis(receipt.baselineAnalysisId), repository.getAnalysis(receipt.followupAnalysisId)]);
  const enrollment = proofWindow?.campaignEnrollmentId ? await repository.getEnrollment(proofWindow.campaignEnrollmentId) : null;
  const campaign = enrollment ? await repository.getCampaign(enrollment.campaignId) : null;
  const reward = enrollment ? await repository.getRewardForEnrollment(enrollment.id) : null;
  return <div className={`app-screen app-proof-detail ${demoMode ? "guided-consumer-screen" : ""}`}>
    {demoMode && campaign ? <DemoProgress activeStep={5} detail="Completion earns the reward regardless of whether the result is keep, swap, or inconclusive." role="consumer" title="Review the receipt and reward" /> : null}
    <Link className="app-back-link" href="/app/proofs">← Proof library</Link>
    {campaign ? <div className="app-receipt-sponsored-banner"><span className="app-sponsored-badge">Sponsored Proof Trial</span><div><strong>{campaign.title}</strong><small>Campaign enrollment {enrollment?.id}</small></div></div> : null}
    <section className="app-receipt-card">
      <header><div><span className="app-receipt-wordmark">BeautyProof</span><small>ProofReceipt · {receipt.id.slice(0, 8).toUpperCase()}</small></div><div className={`app-verdict app-verdict-${receipt.verdict}`}>{receipt.verdict}</div></header>
      <p className="app-kicker">Personal cosmetic observation</p><h1>{product.name}</h1><p className="app-receipt-formula">2026 US Formula · exact formula match</p>
      <div className="app-receipt-claim"><span>Claim observed</span><strong>Visible hydration in 14 days</strong></div>
      <div className="app-receipt-metrics">{(Object.keys(metricNames) as (keyof typeof metricNames)[]).map((metric) => { const delta = receipt.followup[metric] - receipt.baseline[metric]; return <div key={metric}><span>{metricNames[metric]}</span><small>{receipt.baseline[metric].toFixed(1)} start</small><small>{receipt.followup[metric].toFixed(1)} follow-up</small><strong className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}</strong></div>; })}</div>
      <div className="app-receipt-facts"><div><span>Evidence</span><strong>{receipt.evidenceQuality}</strong></div><div><span>Adherence</span><strong>{Math.round(receipt.adherenceRate * 100)}%</strong></div><div><span>Experience</span><strong>{receipt.experience}</strong></div></div>
      <section className="app-receipt-verdict"><p className="app-kicker">What this supports</p><h2>{receipt.verdictExplanation}</h2><p>{receipt.sensoryNote}</p></section>
      <div className="app-provenance"><div><span>Baseline analysis</span><strong>{baseline?.providerTaskId ?? receipt.baselineAnalysisId}</strong><small>{baseline ? analysisOriginLabel(baseline.origin) : "Stored analysis"}</small></div><div><span>Follow-up analysis</span><strong>{followup?.providerTaskId ?? receipt.followupAnalysisId}</strong><small>{followup ? analysisOriginLabel(followup.origin) : "Stored analysis"}</small></div></div>
      <footer><span>Not medical diagnosis or causal proof.</span><span>Created {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(receipt.createdAt))}</span></footer>
    </section>
    {campaign && reward ? <section className="app-reward-earned"><div><span>✓</span><div><p className="app-kicker">Outcome-neutral reward</p><h2>Reward {reward.status} for completing the ProofWindow.</h2><p>This reward does not depend on whether the result was positive, negative, or inconclusive.</p></div></div><aside><strong>{campaign.rewardLabel}</strong><span>{reward.status}</span><small>Prototype credit ledger · no funds moved</small></aside></section> : null}
    <ReceiptConsentButton campaignId={campaign?.id} demoMode={demoMode} initiallyConsented={receipt.consentToAggregate} receiptId={receipt.id} receiptOrigin={receipt.origin} />
  </div>;
}
