import Link from "next/link";
import { ResumeBaselineCard } from "@/components/app/resume-baseline-card";
import { getRepository } from "@/lib/data/repository-provider";
import type { SkinAnalysis } from "@/lib/domain";
import { product } from "@/lib/product";
import { analysisOriginLabel } from "@/lib/provenance";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function metricLabel(metric: string) {
  return metric.replace("hd_", "").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function AppHomePage() {
  const repository = getRepository();
  let windows: Awaited<ReturnType<typeof repository.listWindows>> = [];
  let receipts: Awaited<ReturnType<typeof repository.listReceipts>> = [];
  let campaigns: Awaited<ReturnType<typeof repository.listCampaigns>> = [];
  let coverage = { contributedReal: 0, networkDelta: 0, storedAnalyses: 0, storedWindows: 0, storedReceipts: 0 };
  let dataAvailable = true;
  try {
    [windows, receipts, coverage, campaigns] = await Promise.all([repository.listWindows(), repository.listReceipts(), repository.coverage(), repository.listCampaigns()]);
  } catch {
    dataAvailable = false;
  }
  const activeWindow = windows.find((window) => window.status === "active");
  const heroCampaign = campaigns.find((campaign) => campaign.id === "campaign-dewsignal-hydration-2026");
  const latestReceipt = receipts[0];
  let baseline: SkinAnalysis | null = null;
  let resumableBaseline: SkinAnalysis | null = null;
  try {
    const analyses = await repository.listAnalyses();
    baseline = analyses[0] ?? (activeWindow ? await repository.getAnalysis(activeWindow.baselineAnalysisId) : null);
    const linkedAnalysisIds = new Set([
      ...windows.map((window) => window.baselineAnalysisId),
      ...receipts.flatMap((receipt) => [receipt.baselineAnalysisId, receipt.followupAnalysisId]),
    ]);
    resumableBaseline = analyses.find((analysis) => !linkedAnalysisIds.has(analysis.id)) ?? null;
  } catch { dataAvailable = false; }
  const currentDay = activeWindow?.checkIns.length ? 7 : 1;

  return (
    <div className="app-screen app-dashboard">
      <section className="app-greeting">
        <div><p className="app-kicker">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p><h1>Morning, Kelly.</h1><p>Your skincare evidence is organized around what you need to do next.</p></div>
        <Link className="app-avatar app-avatar-desktop" href="/app/profile">KC</Link>
      </section>
      {!dataAvailable ? <div className="app-data-warning"><strong>Your app is available.</strong><span>Stored evidence could not be refreshed just now. New records remain protected; retry by refreshing.</span></div> : null}
      {resumableBaseline ? <ResumeBaselineCard analysis={{ id: resumableBaseline.id, capturedAt: resumableBaseline.capturedAt, origin: resumableBaseline.origin, moistureScore: resumableBaseline.metrics.hd_moisture }} blockedByActiveTrial={Boolean(activeWindow)} /> : null}

      {heroCampaign ? <Link className="app-opportunity-card" href={`/app/campaigns/${heroCampaign.id}`}><div><span className="app-sponsored-badge">Sponsored Proof Trial · fictional demo brand</span><p className="app-kicker">Aster Vale · current 2026 formula</p><h2>Earn $15 for completing a hydration ProofWindow.</h2><p>Moisture starting range ≤ 60 · 14 days · reward independent of outcome</p></div><aside><span>{heroCampaign.status === "active" ? "Opportunity open" : "Preview opportunity"}</span><strong>$15</strong><small>store credit · demo ledger</small></aside><b>Check eligibility →</b></Link> : null}

      {activeWindow ? (
        <section className="app-trial-card">
          <div className="app-card-topline"><span className="app-status-pill"><i />Active ProofWindow</span><span>Day {currentDay} of 14</span></div>
          <div className="app-trial-main">
            <div className="app-mini-pack"><i /><span>ASTER VALE</span></div>
            <div className="app-trial-copy"><p>{product.brandName}</p><h2>{product.name}</h2><span>Testing visible hydration · current formula</span></div>
            <div className="app-day-ring" style={{ "--app-progress": `${Math.max(12, currentDay / 14 * 100)}%` } as React.CSSProperties}><strong>{currentDay}</strong><small>/ 14</small></div>
          </div>
          <div className="app-progress-track"><i style={{ width: `${Math.max(7, currentDay / 14 * 100)}%` }} /></div>
          <div className="app-trial-footer"><span>Return deadline <strong>{formatDate(activeWindow.returnDeadline)}</strong></span><Link className="app-primary-action" href={`/app/trial/${activeWindow.id}`}>{activeWindow.checkIns.length ? "Continue trial" : "Add Day 7 check-in"} <span>→</span></Link></div>
        </section>
      ) : (
        <section className="app-empty-trial">
          <div><span className="app-status-pill neutral">No active trial</span><h2>Start with a baseline, not a star rating.</h2><p>Scan once, follow one product claim, and leave with evidence you can actually compare.</p></div>
          <Link className="app-primary-action" href="/app/scan">Start a ProofWindow <span>→</span></Link>
        </section>
      )}

      <section className="app-section-heading"><div><p className="app-kicker">Today</p><h2>Your next best actions</h2></div></section>
      <div className="app-action-grid">
        <Link className="app-action-card app-action-scan" href="/app/scan"><div className="app-action-icon">⌁</div><span>New baseline</span><h3>Scan your starting skin</h3><p>Use YouCam Skin AI to create a comparable starting measurement.</p><strong>Open scanner →</strong></Link>
        <div className="app-action-card app-action-insight"><div className="app-action-icon">↗</div><span>Latest signal</span><h3>{baseline ? `${Math.round(baseline.metrics.hd_moisture)} moisture raw score` : "No baseline yet"}</h3><p>{baseline ? `${metricLabel("hd_moisture")} is stored with ${analysisOriginLabel(baseline.origin)} provenance.` : "Your first scan will establish the reference point for a personal trial."}</p>{baseline ? <small>Captured {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(baseline.capturedAt))}</small> : <Link href="/app/scan">Create baseline →</Link>}</div>
      </div>

      <section className="app-section-heading"><div><p className="app-kicker">Your evidence</p><h2>Proof library</h2></div><Link href="/app/proofs">View all</Link></section>
      <div className="app-stat-row">
        <div><strong>{coverage.storedAnalyses}</strong><span>skin observations</span></div>
        <div><strong>{coverage.storedWindows}</strong><span>ProofWindows</span></div>
        <div><strong>{coverage.storedReceipts}</strong><span>ProofReceipts</span></div>
      </div>
      {latestReceipt ? <Link className="app-recent-proof" href={`/app/proofs/${latestReceipt.id}`}><div className={`app-verdict app-verdict-${latestReceipt.verdict}`}>{latestReceipt.verdict}</div><div><span>{product.name}</span><strong>Visible hydration in 14 days</strong><small>{latestReceipt.evidenceQuality} evidence · {Math.round(latestReceipt.adherenceRate * 100)}% adherence</small></div><span className="app-row-arrow">›</span></Link> : <div className="app-empty-list"><span>◎</span><div><strong>Your completed trials will live here.</strong><p>ProofReceipts keep the formula, claim, baseline, follow-up, and limitations together.</p></div></div>}
    </div>
  );
}
