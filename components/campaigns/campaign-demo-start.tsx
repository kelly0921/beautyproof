"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignCoverage, ProofCampaign } from "@/lib/domain";
import { campaignBudgetCents } from "@/lib/campaigns/rewards";
import { DemoProgress } from "./demo-progress";

type Scenario = "keep" | "swap" | "inconclusive";

export function CampaignDemoStart({ campaign, coverage, historicalCount, currentCount }: { campaign: ProofCampaign; coverage: CampaignCoverage; historicalCount: number; currentCount: number }) {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario>("keep");
  const [status, setStatus] = useState<"idle" | "saving" | "resetting" | "error">("idle");

  async function begin() {
    setStatus("saving");
    try {
      if (campaign.status !== "active") {
        const response = await fetch(`/api/proof-campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
        const payload = await response.json() as { ok: boolean; error?: { message: string } };
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message);
      }
      window.localStorage.setItem("beautyproof-campaign-demo-scenario-v2", scenario);
      router.push(`/app/campaigns/${campaign.id}?demo=1&scenario=${scenario}`);
    } catch {
      setStatus("error");
    }
  }

  async function reset() {
    setStatus("resetting");
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error();
      window.localStorage.removeItem("beautyproof-campaign-demo-scenario-v2");
      router.refresh();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const budget = campaignBudgetCents(campaign) / 100;
  const completion = Math.round(coverage.completionRate * 100);
  const campaignActive = campaign.status === "active";

  return <main className="guided-demo-experience">
    <DemoProgress activeStep={1} detail={campaignActive ? "The funded gap is live. Continue into the matching consumer experience." : "Aster Vale chooses one measurable gap and funds completion—not praise."} role="brand" title={campaignActive ? "Continue to consumer match" : "Activate the campaign"} />

    <section className="guided-data-disclosure"><strong>Demo data disclosure</strong><span>Aster Vale and DewSignal are fictional. Background ProofReceipts are synthetic, and the reliable judge baseline is a simulated YouCam-format fixture.</span><small>Only the live upload path creates real YouCam user evidence.</small></section>

    <section className="guided-demo-stage">
      <header className="guided-demo-heading">
        <div><span className="guided-screen-number">01</span><div><p>Brand workspace</p><span>{campaignActive ? "Campaign active" : "Campaign draft"}</span></div></div>
        <h1>Fund one missing proof gap.</h1>
        <p>The formula changed, so the old evidence stays historical. Aster Vale can now fund new observations for the exact 2026 formula.</p>
      </header>

      <div className="guided-demo-grid">
        <section className="guided-campaign-card">
          <header><div><span>ASTER VALE</span><small>Sponsored Proof Campaign</small></div><span className={`guided-status ${campaign.status}`}>{campaign.status}</span></header>
          <h2>DewSignal 2026<br />Hydration Proof</h2>
          <p>Close the evidence gap for shoppers starting with a moisture raw score of 60 or below.</p>

          <div className="guided-campaign-facts">
            <div><span>Measured</span><strong>YouCam moisture</strong><small>Baseline + follow-up</small></div>
            <div><span>Protocol</span><strong>{campaign.requiredDurationDays} days</strong><small>Same formula and claim</small></div>
            <div><span>Reward</span><strong>{campaign.rewardLabel}</strong><small>Any valid outcome</small></div>
          </div>

          <div className="guided-coverage-preview">
            <div><span>Current-formula campaign coverage</span><strong>{coverage.completedReceiptCount} / {campaign.targetReceiptCount}</strong></div>
            <div className="guided-progress-track"><i style={{ width: `${completion}%` }} /></div>
            <div><small>{coverage.remainingGap} receipts still needed</small><small>${budget.toLocaleString()} prototype budget</small></div>
          </div>

          <div className="guided-evidence-boundaries">
            <span><i className="supported" />Hydration measured</span>
            <span><i className="subjective" />Finish self-reported</span>
            <span><i className="blocked" />Barrier repair blocked</span>
          </div>
        </section>

        <aside className="guided-action-panel">
          <div><p className="guided-action-kicker">Your action</p><h2>{campaignActive ? "Continue as the matching consumer." : "Activate the funded campaign."}</h2><p>{campaignActive ? "The campaign is already live. The next screen switches clearly into the consumer app." : "This makes the opportunity available to a matching consumer. The next screen switches clearly into the consumer app."}</p></div>
          <button className="guided-primary-action" disabled={status === "saving" || status === "resetting"} onClick={begin} type="button">{status === "saving" ? "Activating…" : campaign.status === "active" ? "Continue to consumer match" : "Activate campaign and continue"}<span>→</span></button>
          <div className="guided-scenario-control"><span>Demo outcome</span><div>{(["keep", "swap", "inconclusive"] as Scenario[]).map((value) => <button aria-pressed={scenario === value} className={scenario === value ? "selected" : ""} key={value} onClick={() => setScenario(value)} type="button">{value}</button>)}</div><small>The reward stays the same in every scenario.</small></div>
          <div className="guided-formula-reset"><span>Formula reset</span><div><strong>{historicalCount}</strong><small>historical receipts<br />excluded</small><i>→</i><strong>{currentCount}</strong><small>current-formula<br />seed evidence</small></div></div>
          <button className="guided-reset-action" disabled={status === "saving" || status === "resetting"} onClick={reset} type="button">{status === "resetting" ? "Resetting…" : "Reset demo data"}</button>
          {status === "error" ? <small className="guided-error" role="alert">The demo could not continue. Please try again.</small> : null}
        </aside>
      </div>
    </section>

    <p className="guided-demo-boundary">Cosmetic observation and decision support—not diagnosis, clinical research, causal proof, or real financing.</p>
  </main>;
}
