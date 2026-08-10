"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignEnrollment, Experience, ProofCampaign, RewardLedgerEntry, SkinAnalysis } from "@/lib/domain";
import type { ProofWindowRecord } from "@/lib/data/repository";
import { DemoProgress } from "@/components/campaigns/demo-progress";
import { analysisOriginLabel } from "@/lib/provenance";

function dateString(date: Date) { return date.toISOString().slice(0, 10); }

interface AppTrialFlowProps {
  proofWindow: ProofWindowRecord;
  baseline: SkinAnalysis;
  receiptId?: string;
  campaign?: ProofCampaign;
  enrollment?: CampaignEnrollment;
  reward?: RewardLedgerEntry;
  scenario?: "keep" | "swap" | "inconclusive";
  demoMode?: boolean;
}

export function AppTrialFlow({ proofWindow, baseline, receiptId, campaign, enrollment, reward, scenario, demoMode = false }: AppTrialFlowProps) {
  const router = useRouter();
  const [experience, setExperience] = useState<Experience>(proofWindow.checkIns[0]?.experience ?? (scenario === "swap" ? "neutral" : "good"));
  const [usedProduct, setUsedProduct] = useState(proofWindow.checkIns[0]?.usedProduct ?? true);
  const [confounder, setConfounder] = useState(Boolean(proofWindow.checkIns[0]?.confounderNote) || scenario === "inconclusive");
  const [checkInSaved, setCheckInSaved] = useState(proofWindow.checkIns.length > 0);
  const [timeJumped, setTimeJumped] = useState(false);
  const [followupFile, setFollowupFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "analyzing" | "error">("idle");
  const [message, setMessage] = useState("");

  async function saveCheckIn() {
    setStatus("saving");
    setMessage("Saving your check-in…");
    try {
      const response = await fetch(`/api/proof-windows/${proofWindow.id}/check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateString(new Date()), usedProduct, experience, confounderNote: confounder ? "Routine or environmental conditions changed." : undefined }),
      });
      const payload = await response.json() as { ok: boolean; error?: { message: string } };
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "The check-in could not be saved.");
      setCheckInSaved(true);
      setStatus("idle");
      setMessage("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The check-in could not be saved.");
    }
  }

  async function finishTrial(mode: "upload" | "demo") {
    setStatus("analyzing");
    setMessage(mode === "upload" ? "Running the follow-up through YouCam Skin AI…" : "Loading the simulated YouCam-format follow-up fixture…");
    try {
      const completionScenario = scenario ?? (confounder ? "inconclusive" : experience === "concern" ? "swap" : "keep");
      let response: Response;
      if (mode === "demo") {
        response = await fetch("/api/skin-analysis/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "followup", scenario: completionScenario, allowCachedFallback: true }),
        });
      } else {
        if (!followupFile) throw new Error("Choose a high-resolution follow-up photo first.");
        const form = new FormData();
        form.set("file", followupFile);
        form.set("allowCachedFallback", "false");
        form.set("captureMode", "upload");
        response = await fetch("/api/skin-analysis/upload", { method: "POST", body: form });
      }
      const analysisPayload = await response.json() as { ok: boolean; data?: { analysis: SkinAnalysis }; error?: { message: string } };
      if (!response.ok || !analysisPayload.ok || !analysisPayload.data) throw new Error(analysisPayload.error?.message ?? "The follow-up analysis failed.");
      const completion = await fetch(`/api/proof-windows/${proofWindow.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: completionScenario, followupAnalysisId: analysisPayload.data.analysis.id, experience, majorConfounder: confounder, demoTimeJump: timeJumped }),
      });
      const completionPayload = await completion.json() as { ok: boolean; data?: { receipt: { id: string } }; error?: { message: string } };
      if (!completion.ok || !completionPayload.ok || !completionPayload.data) throw new Error(completionPayload.error?.message ?? "The ProofReceipt could not be generated.");
      const query = campaign ? `?campaign=${campaign.id}${demoMode ? "&demo=1" : ""}` : "";
      router.push(`/app/proofs/${completionPayload.data.receipt.id}${query}`);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The trial could not be completed.");
    }
  }

  const demoTitle = !checkInSaved ? "Save the Day 7 check-in" : !timeJumped ? "Advance the demo to Day 14" : "Complete the follow-up";
  const demoDetail = !checkInSaved ? "A short adherence check keeps the final receipt honest." : !timeJumped ? "The labeled time jump demonstrates the flow; its receipt remains synthetic." : "A second measurement closes the simulated observation window.";

  if (proofWindow.status === "complete") {
    const query = campaign ? `?campaign=${campaign.id}${demoMode ? "&demo=1" : ""}` : "";
    return <div className="app-screen">{demoMode ? <DemoProgress activeStep={5} detail="The protocol is complete; open the standardized receipt and earned reward." role="consumer" title="Review the ProofReceipt" /> : null}<section className="app-complete-state"><span>✓</span><p className="app-kicker">{campaign ? "Sponsored ProofWindow complete" : "ProofWindow complete"}</p><h1>Your evidence is ready.</h1><p>The baseline, follow-up, formula, claim, adherence, and limitations are stored together.{reward ? ` Reward status: ${reward.status}.` : ""}</p>{receiptId ? <Link className="app-primary-action" href={`/app/proofs/${receiptId}${query}`}>Open ProofReceipt →</Link> : <Link className="app-primary-action" href="/app/proofs">View proof library →</Link>}</section></div>;
  }

  return <div className={`app-screen app-trial-screen ${demoMode ? "guided-consumer-screen" : ""}`}>
    {demoMode ? <DemoProgress activeStep={4} detail={demoDetail} role="consumer" title={demoTitle} /> : null}
    <header className="app-page-heading">{campaign ? <span className="app-sponsored-badge">Sponsored Proof Trial</span> : null}<p className="app-kicker">Active ProofWindow</p><h1>DewSignal hydration trial</h1><p>Your baseline is stored. A quick check-in keeps the final receipt honest.</p></header>
    {campaign && enrollment && reward ? <section className="app-sponsored-context"><div><span>Exact campaign</span><strong>{campaign.title}</strong><small>2026 US Formula · visible hydration in 14 days</small></div><div><span>Reward status</span><strong>{reward.status}</strong><small>{campaign.rewardLabel} · prototype ledger</small></div><p>The reward depends on completing this protocol—not on whether the result is positive, negative, or inconclusive.</p></section> : null}
    <section className="app-trial-progress-card"><div className="app-trial-progress-head"><div><span>Day {checkInSaved ? 7 : 1} of 14</span><strong>{checkInSaved ? "Check-in ready" : "Trial in progress"}</strong></div><span className="app-origin-badge"><i />{analysisOriginLabel(baseline.origin)}</span></div><div className="app-plan-days active"><span className="done"><strong>0</strong>Baseline</span><i /><span className={checkInSaved ? "done" : "current"}><strong>7</strong>Check-in</span><i /><span><strong>14</strong>Follow-up</span></div><div className="app-trial-date-row"><span>Started <strong>{proofWindow.startDate}</strong></span><span>Return by <strong>{proofWindow.returnDeadline}</strong></span></div></section>
    <section className="app-checkin-card"><p className="app-kicker">Under 10 seconds</p><h2>How is the trial going?</h2><div className="app-checkin-question"><span>Used the product?</span><div><button className={usedProduct ? "selected" : ""} onClick={() => setUsedProduct(true)} type="button">Yes</button><button className={!usedProduct ? "selected" : ""} onClick={() => setUsedProduct(false)} type="button">No</button></div></div><div className="app-checkin-question"><span>How did it feel?</span><div>{(["good", "neutral", "concern"] as Experience[]).map((value) => <button className={experience === value ? "selected" : ""} key={value} onClick={() => setExperience(value)} type="button">{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div><div className="app-checkin-question"><span>Anything else changed?</span><div><button className={!confounder ? "selected" : ""} onClick={() => setConfounder(false)} type="button">No</button><button className={confounder ? "selected" : ""} onClick={() => setConfounder(true)} type="button">Add context</button></div></div><button className="app-primary-action app-full-action" disabled={checkInSaved || status === "saving"} onClick={saveCheckIn} type="button">{checkInSaved ? "Check-in saved ✓" : status === "saving" ? "Saving…" : "Save check-in"}</button></section>
    {checkInSaved ? <section className="app-followup-card"><div><p className="app-kicker">Demo checkpoint</p><h2>{timeJumped ? "Complete your Day 14 follow-up" : "Your follow-up unlocks on Day 14"}</h2><p>{timeJumped ? "Use the same framing and lighting where possible. Because the duration is time-jumped, the resulting receipt remains synthetic even when the images are live." : "For this hackathon prototype, the labeled time jump demonstrates the full flow without claiming that 14 days elapsed."}</p></div>{!timeJumped ? <button className="app-secondary-action" onClick={() => setTimeJumped(true)} type="button">Demo time jump → Day 14</button> : <div className="app-followup-controls"><label className="app-file-picker"><input accept="image/jpeg,image/png" capture="user" onChange={(event) => setFollowupFile(event.target.files?.[0] ?? null)} type="file" /><span>{followupFile ? "Follow-up selected" : "Choose follow-up photo"}</span><strong>{followupFile ? followupFile.name : "Camera or photo library"}</strong></label><button className="app-primary-action app-full-action" disabled={!followupFile || status === "analyzing"} onClick={() => finishTrial("upload")} type="button">{status === "analyzing" ? "Analyzing…" : "Analyze live follow-up"}<span>→</span></button><button className="app-secondary-action app-full-action" disabled={status === "analyzing"} onClick={() => finishTrial("demo")} type="button">Use simulated demo follow-up</button></div>}</section> : null}
    {message ? <p aria-live="polite" className={status === "error" ? "app-error-message" : "app-status-message"}>{message}</p> : null}
  </div>;
}
