import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptConsentButton } from "@/components/app/receipt-consent-button";
import { ReceiptActions, type ReceiptShareData } from "@/components/app/receipt-actions";
import { DemoProgress } from "@/components/campaigns/demo-progress";
import { getRequestRepository } from "@/lib/data/repository-provider";
import { claims, formulas, product } from "@/lib/product";
import { analysisOriginLabel } from "@/lib/provenance";
import { qualityLabel } from "@/lib/evidence/quality";

export const dynamic = "force-dynamic";

const metricNames = { hd_moisture: "Moisture", hd_redness: "Redness", hd_texture: "Texture", hd_oiliness: "Oiliness" };

function dateValue(value: string) { return Date.parse(`${value}T00:00:00.000Z`); }
function daysBetween(start: string, end: string) { return Math.max(0, Math.round((dateValue(end) - dateValue(start)) / 86_400_000)); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`)); }

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
  const formula = formulas.find((entry) => entry.id === proofWindow?.formulaVersionId) ?? formulas[1];
  const claim = claims.find((entry) => entry.id === proofWindow?.claimId) ?? claims[0];
  const plannedDuration = proofWindow ? daysBetween(proofWindow.startDate, proofWindow.plannedEndDate) : claim.claimPeriodDays ?? 14;
  const durationComplete = receipt.evidenceReasons.some((reason) => reason.label.includes("duration") && reason.earned);
  const completedUses = Math.min(plannedDuration, Math.max(0, Math.floor(receipt.adherenceRate * plannedDuration + 0.001)));
  const routineStable = receipt.evidenceReasons.some((reason) => reason.label.includes("Routine") && reason.earned);
  const confounderNotes = proofWindow?.checkIns.flatMap((checkIn) => checkIn.confounderNote ? [checkIn.confounderNote] : []) ?? [];
  const confounderSummary = confounderNotes.length ? confounderNotes.join(" ") : routineStable ? "None reported; routine remained reasonably stable." : "Routine stability was not confirmed.";
  const returnDaysRemaining = proofWindow ? Math.max(0, daysBetween(proofWindow.plannedEndDate, proofWindow.returnDeadline)) : 0;
  const receiptMetrics = (Object.keys(metricNames) as (keyof typeof metricNames)[]).map((metric) => ({ label: metricNames[metric], start: receipt.baseline[metric], followup: receipt.followup[metric], delta: receipt.followup[metric] - receipt.baseline[metric] }));
  const measurementOrigin = baseline && followup && baseline.origin !== followup.origin ? `${analysisOriginLabel(baseline.origin)} baseline; ${analysisOriginLabel(followup.origin)} follow-up` : baseline ? analysisOriginLabel(baseline.origin) : receipt.origin === "real" ? "Verified YouCam analysis" : "Synthetic demonstration record";
  const limitation = "Cosmetic image observations during a personal trial; not medical diagnosis, clinical proof, scientific efficacy verification, or evidence that the product caused a change.";
  const shareData: ReceiptShareData = {
    receiptId: receipt.id,
    productName: product.name,
    brandName: product.brandName,
    formulaLabel: formula.versionLabel,
    claim: claim.text,
    verdict: receipt.verdict,
    evidenceLabel: qualityLabel[receipt.evidenceQuality],
    evidenceScore: receipt.evidenceScore,
    adherenceLabel: `${completedUses} / ${plannedDuration} uses (${Math.round(receipt.adherenceRate * 100)}%)`,
    trialDateLabel: proofWindow ? `${formatDate(proofWindow.startDate)} – ${formatDate(proofWindow.plannedEndDate)} · ${durationComplete ? "completed" : "incomplete"}` : `${plannedDuration}-day plan`,
    returnLabel: `${returnDaysRemaining} days remained at the planned checkpoint`,
    experience: receipt.experience,
    sensoryNote: receipt.sensoryNote,
    confounderSummary,
    verdictExplanation: receipt.verdictExplanation,
    limitation,
    originLabel: measurementOrigin,
    evidenceReasons: receipt.evidenceReasons.map((reason) => `${reason.earned ? "Met" : "Not met"}: ${reason.label} (${reason.points}/20)`),
    metrics: receiptMetrics,
  };
  return <div className={`app-screen app-proof-detail ${demoMode ? "guided-consumer-screen" : ""}`}>
    {demoMode && campaign ? <DemoProgress activeStep={5} detail="Completion earns the reward regardless of whether the result is keep, swap, or inconclusive." role="consumer" title="Review the receipt and reward" /> : null}
    <Link className="app-back-link" href="/app/proofs">← Proof library</Link>
    {campaign ? <div className="app-receipt-sponsored-banner"><span className="app-sponsored-badge">Sponsored Proof Trial</span><div><strong>{campaign.title}</strong><small>Campaign enrollment {enrollment?.id}</small></div></div> : null}
    {campaign && reward ? <section className="app-completion-celebration">
      <div className="app-completion-mark" aria-hidden="true">✓</div>
      <div className="app-completion-copy"><p className="app-kicker">ProofWindow complete · outcome neutral</p><h1>Reward {reward.status} for completing the ProofWindow.</h1><p>The protocol—not the verdict—earned this reward. Your <span className={`app-verdict app-verdict-${receipt.verdict}`}>{receipt.verdict}</span> result remains visible and honest.</p></div>
      <aside><span>{campaign.rewardLabel}</span><strong>{reward.status}</strong><small>Prototype credit ledger · no funds moved</small><div aria-label="Reward path: pending, earned, issued in demo" className="app-reward-rail" data-status={reward.status}><i>Pending</i><b>→</b><i>Earned</i><b>→</b><i>Issued</i></div></aside>
    </section> : null}
    <div className="app-receipt-introduction"><div><p className="app-kicker">Standardized evidence label</p><h2>Now scan the proof, not just the verdict.</h2></div><span>Formula · baseline · change · adherence · quality · origin · limitations</span></div>
    <section className="app-receipt-card">
      <header><div><span className="app-receipt-wordmark">BeautyProof</span><small>ProofReceipt · {receipt.id.slice(0, 8).toUpperCase()}</small></div><div className={`app-verdict app-verdict-${receipt.verdict}`}>{receipt.verdict}</div></header>
      <p className="app-kicker">Personal cosmetic observation</p><h1>{product.name}</h1><p className="app-receipt-formula">{formula.versionLabel} · fingerprint {formula.fingerprint}</p>
      <div className="app-receipt-claim"><span>Claim observed</span><strong>{claim.text}</strong></div>
      <div className="app-receipt-metrics">{receiptMetrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><small>{metric.start.toFixed(1)} start</small><small>{metric.followup.toFixed(1)} follow-up</small><strong className={metric.delta >= 0 ? "positive" : "negative"}>{metric.delta >= 0 ? "+" : ""}{metric.delta.toFixed(1)}</strong></div>)}</div>
      <div className="app-receipt-facts"><div><span>Evidence</span><strong>{qualityLabel[receipt.evidenceQuality]}</strong><small>{receipt.evidenceScore}/100 internal rubric</small></div><div><span>Completed uses</span><strong>{completedUses} / {plannedDuration}</strong><small>{Math.round(receipt.adherenceRate * 100)}% adherence</small></div><div><span>Experience</span><strong>{receipt.experience}</strong><small>Self-reported</small></div></div>
      {proofWindow ? <div className="app-receipt-trial-context"><div><span>Trial dates</span><strong>{formatDate(proofWindow.startDate)} – {formatDate(proofWindow.plannedEndDate)}</strong><small>{plannedDuration}-day claim-aligned plan · {durationComplete ? "duration completed" : "duration incomplete"}</small></div><div><span>Return timing</span><strong>{returnDaysRemaining} days remained</strong><small>At the planned Day {plannedDuration} checkpoint</small></div><div><span>Routine and confounders</span><strong>{routineStable ? "Reasonably stable" : "Context affected evidence"}</strong><small>{confounderSummary}</small></div></div> : null}
      <section className="app-receipt-quality"><div><p className="app-kicker">Evidence quality</p><h2>{qualityLabel[receipt.evidenceQuality]}</h2><strong>{receipt.evidenceScore}/100</strong></div><ul>{receipt.evidenceReasons.map((reason) => <li className={reason.earned ? "earned" : "not-earned"} key={reason.label}><span>{reason.earned ? "✓" : "–"}</span><p><strong>{reason.label}</strong><small>{reason.earned ? "Requirement met" : "Requirement not met"} · {reason.points}/20 points</small></p></li>)}</ul></section>
      <section className="app-receipt-verdict"><p className="app-kicker">What this supports</p><h2>{receipt.verdictExplanation}</h2><p>{receipt.sensoryNote}</p></section>
      <div className="app-provenance"><div><span>Baseline analysis</span><strong>{baseline?.providerTaskId ?? receipt.baselineAnalysisId}</strong><small>{baseline ? analysisOriginLabel(baseline.origin) : "Stored analysis"}</small></div><div><span>Follow-up analysis</span><strong>{followup?.providerTaskId ?? receipt.followupAnalysisId}</strong><small>{followup ? analysisOriginLabel(followup.origin) : "Stored analysis"}</small></div></div>
      <div className="app-receipt-limitation"><strong>Limitation</strong><p>{limitation}</p></div>
      <footer><span>{receipt.origin === "real" ? "Verified personal evidence" : "Synthetic demonstration evidence"}</span><span>Created {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(receipt.createdAt))}</span></footer>
    </section>
    <section className="app-receipt-source-note"><div><p className="app-kicker">Where this information came from</p><h2>Measurement and context stay separate.</h2><p><strong>Skin measurements:</strong> {measurementOrigin}. <strong>Product, price, formula, claims, and campaign:</strong> curated fictional BeautyProof prototype data. <strong>Public network:</strong> {receipt.consentToAggregate ? "separately consented" : "still private"}.</p></div><Link href="/app/data-sources">See all data sources →</Link></section>
    <ReceiptActions data={shareData} />
    <ReceiptConsentButton campaignId={campaign?.id} demoMode={demoMode} initiallyConsented={receipt.consentToAggregate} receiptId={receipt.id} receiptOrigin={receipt.origin} />
  </div>;
}
