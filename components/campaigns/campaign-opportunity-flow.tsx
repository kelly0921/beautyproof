"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignEligibilityResult, CampaignEnrollment, ProofCampaign, RewardLedgerEntry, SkinAnalysis } from "@/lib/domain";
import { DemoProgress } from "./demo-progress";

type Scenario = "keep" | "swap" | "inconclusive";

function dateAfter(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function CampaignOpportunityFlow({ campaign, scenario = "keep", demoMode = false }: { campaign: ProofCampaign; scenario?: Scenario; demoMode?: boolean }) {
  const router = useRouter();
  const [source, setSource] = useState<"demo" | "upload">("demo");
  const [file, setFile] = useState<File | null>(null);
  const [captureConsent, setCaptureConsent] = useState(false);
  const [campaignConsent, setCampaignConsent] = useState(false);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [eligibility, setEligibility] = useState<CampaignEligibilityResult | null>(null);
  const [enrollment, setEnrollment] = useState<CampaignEnrollment | null>(null);
  const [reward, setReward] = useState<RewardLedgerEntry | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "enrolling" | "starting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function checkEligibility() {
    if (!captureConsent) return;
    setStatus("analyzing");
    setMessage(source === "demo" ? "Loading the simulated YouCam-format starting fixture…" : "Running the starting image through YouCam Skin AI…");
    try {
      let response: Response;
      if (source === "demo") {
        response = await fetch("/api/skin-analysis/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "baseline", scenario, allowCachedFallback: true }) });
      } else {
        if (!file) throw new Error("Choose a high-resolution JPG or PNG first.");
        const form = new FormData();
        form.set("file", file);
        form.set("allowCachedFallback", "false");
        form.set("captureMode", "upload");
        response = await fetch("/api/skin-analysis/upload", { method: "POST", body: form });
      }
      const analysisPayload = await response.json() as { ok: boolean; data?: { analysis: SkinAnalysis }; error?: { message: string } };
      if (!response.ok || !analysisPayload.ok || !analysisPayload.data) throw new Error(analysisPayload.error?.message ?? "The starting analysis could not be completed.");
      const savedAnalysis = analysisPayload.data.analysis;
      const eligibilityResponse = await fetch(`/api/proof-campaigns/${campaign.id}/eligibility`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baselineAnalysisId: savedAnalysis.id }) });
      const eligibilityPayload = await eligibilityResponse.json() as { ok: boolean; data?: CampaignEligibilityResult; error?: { message: string } };
      if (!eligibilityResponse.ok || !eligibilityPayload.ok || !eligibilityPayload.data) throw new Error(eligibilityPayload.error?.message ?? "Eligibility could not be evaluated.");
      setAnalysis(savedAnalysis);
      setEligibility(eligibilityPayload.data);
      setStatus("idle");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The opportunity check could not be completed.");
    }
  }

  async function enroll() {
    if (!analysis || !campaignConsent) return;
    setStatus("enrolling");
    try {
      const response = await fetch(`/api/proof-campaigns/${campaign.id}/enroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baselineAnalysisId: analysis.id, campaignConsent: true }) });
      const payload = await response.json() as { ok: boolean; data?: { enrollment: CampaignEnrollment; reward: RewardLedgerEntry }; error?: { message: string } };
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message ?? "Enrollment could not be completed.");
      setEnrollment(payload.data.enrollment);
      setReward(payload.data.reward);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Enrollment could not be completed.");
    }
  }

  async function startWindow() {
    if (!analysis || !enrollment) return;
    setStatus("starting");
    try {
      const response = await fetch("/api/proof-windows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        formulaVersionId: campaign.formulaVersionId,
        claimId: campaign.claimId,
        baselineAnalysisId: analysis.id,
        campaignEnrollmentId: enrollment.id,
        startDate: dateAfter(0),
        plannedEndDate: dateAfter(campaign.requiredDurationDays),
        returnDeadline: dateAfter(30),
        status: "active",
      }) });
      const payload = await response.json() as { ok: boolean; data?: { id: string }; error?: { message: string } };
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message ?? "The sponsored ProofWindow could not be created.");
      router.push(`/app/trial/${payload.data.id}?campaign=${campaign.id}&scenario=${scenario}${demoMode ? "&demo=1" : ""}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The sponsored ProofWindow could not be created.");
    }
  }

  const demoStep = analysis ? 3 : 2;
  const demoTitle = !analysis ? "Check the starting measurement" : !enrollment ? "Review the match and enroll" : "Start the sponsored trial";
  const demoDetail = !analysis ? "YouCam supplies the numeric baseline used for transparent eligibility." : !enrollment ? "The match is explainable, and campaign consent is explicit." : "The reward is pending until a valid ProofReceipt is stored.";

  return <div className={`app-screen app-campaign-opportunity ${demoMode ? "guided-consumer-screen" : ""}`}>
    {demoMode ? <DemoProgress activeStep={demoStep} detail={demoDetail} role="consumer" title={demoTitle} /> : null}
    {demoMode ? <section className="guided-data-disclosure consumer"><strong>Simulated judge path</strong><span>This deterministic measurement demonstrates matching and consent without representing a real person.</span><small>Choose the live upload option to create verified YouCam evidence.</small></section> : null}
    <Link className="app-back-link" href={demoMode ? "/demo" : "/app"}>{demoMode ? "← Restart guided demo" : "← Home"}</Link>
    <header className={`app-campaign-hero ${demoMode ? "guided-app-hero" : ""}`}><span>Sponsored Proof Trial · fictional demo brand</span><p className="app-kicker">Aster Vale · exact 2026 formula</p><h1>Help fill the hydration proof gap.</h1><p>Complete one 14-day, claim-specific observation and earn {campaign.rewardLabel}. The result does not need to be positive.</p><div><strong>{campaign.rewardLabel}</strong><span>{campaign.requiredDurationDays} days · outcome neutral</span></div></header>
    {demoMode ? <section className="guided-app-rule"><div><span>Campaign match rule</span><strong>Moisture raw score ≤ 60</strong></div><p>Eligibility uses the exact formula, claim, YouCam provenance, starting range, and trial readiness—never demographics or facial identity.</p></section> : <section className="app-campaign-boundaries"><div><span>Measured</span><strong>HD moisture raw score</strong><p>Compared at a guided baseline and follow-up.</p></div><div><span>Subjective</span><strong>How the serum feels</strong><p>Recorded in your check-in, never inferred.</p></div><div><span>Not proved</span><strong>Barrier repair or causality</strong><p>This is not diagnosis, efficacy verification, or a clinical trial.</p></div></section>}
    <section aria-label="Sponsored trial participation summary" className="app-participation-summary">
      <header><p className="app-kicker">Before you enroll</p><h2>The agreement in plain language.</h2></header>
      <div><span>What you do</span><strong>Day 0, 7, and 14 observations</strong></div>
      <div><span>What you receive</span><strong>{campaign.rewardLabel}</strong></div>
      <div><span>Reward depends on</span><strong>Valid protocol completion</strong></div>
      <div><span>Reward never depends on</span><strong>A positive result</strong></div>
      <footer><strong>Your two choices stay separate.</strong><span>Joining this campaign does not automatically add your ProofReceipt to the public shopper ProofMap.</span></footer>
    </section>
    {campaign.status !== "active" ? <section className="app-campaign-inactive"><h2>This opportunity is not active yet.</h2><p>The brand must activate the funded evidence gap before consumers can qualify.</p><Link href={`/brand/campaigns/${campaign.id}`}>Open brand campaign →</Link></section> : null}
    {!analysis && campaign.status === "active" ? <section className="app-campaign-scan"><div><p className="app-kicker">Consumer action · explainable matching</p><h2>Check your starting measurement</h2><p>{demoMode ? "The reliable path uses a clearly labeled simulated YouCam-format fixture. A prepared high-resolution image can still be used for the live API recording." : "Choose a simulated demo baseline or upload a high-resolution image for live server-side YouCam analysis."}</p></div>{demoMode ? <div className="guided-source-lock"><span>{source === "demo" ? "Reliable judge path" : "Live YouCam path"}</span><strong>{source === "demo" ? "Simulated YouCam-format baseline" : "High-resolution image upload"}</strong><small>{source === "demo" ? "Synthetic origin · deterministic result · not a real person" : "Server-side YouCam Skin AI v2.1 · no silent fallback"}</small><button onClick={() => setSource(source === "demo" ? "upload" : "demo")} type="button">{source === "demo" ? "Use live YouCam image instead" : "Use reliable demo fixture instead"}</button></div> : <div className="app-campaign-source"><button aria-pressed={source === "demo"} className={source === "demo" ? "selected" : ""} onClick={() => setSource("demo")} type="button"><strong>Simulated demo baseline</strong><span>YouCam-format fixture · synthetic origin</span></button><button aria-pressed={source === "upload"} className={source === "upload" ? "selected" : ""} onClick={() => setSource("upload")} type="button"><strong>High-resolution upload</strong><span>Live server-side YouCam Skin AI v2.1</span></button></div>}{source === "upload" ? <label className="app-file-picker"><input accept="image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /><span>{file ? "Starting image selected" : "Choose starting image"}</span><strong>{file?.name ?? "JPG or PNG · short side ≥ 1080 px"}</strong></label> : null}<label className="app-campaign-consent"><input checked={captureConsent} onChange={(event) => setCaptureConsent(event.target.checked)} type="checkbox" /><span><strong>{source === "demo" ? "I understand this is simulated demo data." : "I consent to cosmetic starting analysis."}</strong> {source === "demo" ? "No real person or face image is represented by this fixture." : "The image is processed through YouCam and is not retained after numeric results return."}</span></label><button className="app-primary-action app-full-action" disabled={!captureConsent || status === "analyzing" || (source === "upload" && !file)} onClick={checkEligibility} type="button">{status === "analyzing" ? "Checking opportunity…" : "Check campaign eligibility →"}</button></section> : null}
    {analysis && eligibility ? <section className={`app-eligibility-card ${eligibility.eligible ? "eligible" : "ineligible"}`}><header><span>{eligibility.eligible ? "✓" : "–"}</span><div><p className="app-kicker">Eligibility decision</p><h2>{eligibility.eligible ? "You qualify" : "This campaign is not the right match today"}</h2><p>{eligibility.eligible ? `Your moisture raw score is ${analysis.metrics.hd_moisture.toFixed(1)}. It falls within this campaign’s evidence gap of 60 or below.` : "Your current starting measurement does not match this specific evidence gap. This does not describe your skin as healthy or unhealthy."}</p></div></header><div className="app-eligibility-reasons">{eligibility.reasons.map((reason) => <div key={reason.code}><span>{reason.passed ? "✓" : "–"}</span><p>{reason.message}</p></div>)}</div>{eligibility.eligible && !enrollment ? <><label className="app-campaign-consent terms"><input checked={campaignConsent} onChange={(event) => setCampaignConsent(event.target.checked)} type="checkbox" /><span><strong>I accept the sponsored Proof Trial terms.</strong> De-identified campaign-level outcomes update campaign coverage. My reward is independent of result. Broader shopper ProofMap contribution remains a separate choice.</span></label><button className="app-primary-action app-full-action" disabled={!campaignConsent || status === "enrolling"} onClick={enroll} type="button">{status === "enrolling" ? "Enrolling…" : `Enroll · ${campaign.rewardLabel} pending`}</button></> : null}</section> : null}
    {enrollment && reward ? <section className="app-enrollment-ready"><div><span className="app-sponsored-badge">Sponsored Proof Trial</span><p className="app-kicker">Step 2 · enrollment confirmed</p><h2>Your reward ledger is pending.</h2><p>It will become earned only after a valid ProofReceipt is stored—regardless of whether the result is positive, negative, or inconclusive.</p></div><aside><span>Reward status</span><strong>{reward.status}</strong><small>Prototype credit ledger · no funds moved</small><div aria-label="Reward path: pending, earned, issued in demo" className="app-reward-rail" data-status={reward.status}><i>Pending</i><b>→</b><i>Earned</i><b>→</b><i>Issued</i></div></aside><button className="app-primary-action app-full-action" disabled={status === "starting"} onClick={startWindow} type="button">{status === "starting" ? "Starting ProofWindow…" : "Start sponsored 14-day ProofWindow →"}</button></section> : null}
    {message ? <p className={status === "error" ? "app-error-message" : "app-status-message"} role="status">{message}</p> : null}
  </div>;
}
