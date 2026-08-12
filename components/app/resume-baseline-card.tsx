"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SkinAnalysis } from "@/lib/domain";
import { analysisOriginLabel } from "@/lib/provenance";

function dateString(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number) { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; }

export function ResumeBaselineCard({ analysis, blockedByActiveTrial = false }: { analysis: SkinAnalysis; blockedByActiveTrial?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "starting" | "error">("idle");

  async function resume() {
    setStatus("starting");
    const start = new Date();
    try {
      const response = await fetch("/api/proof-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formulaVersionId: "formula-2026-us", claimId: "claim-hydration-2026", baselineAnalysisId: analysis.id, startDate: dateString(start), plannedEndDate: dateString(addDays(start, 14)), returnDeadline: dateString(addDays(start, 30)), status: "active" }),
      });
      const payload = await response.json() as { ok: boolean; data?: { id: string }; error?: { message: string } };
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message ?? "The ProofWindow could not be started.");
      router.push(`/app/trial/${payload.data.id}`);
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return <section className="app-resume-baseline">
    <div><span className="app-origin-badge"><i />{analysisOriginLabel(analysis.origin)}</span><p className="app-kicker">Saved starting measurement</p><h2>{blockedByActiveTrial ? "Your latest scan is saved." : "Continue from your latest baseline."}</h2><p>{analysis.metrics.hd_moisture.toFixed(1)} moisture raw score · captured {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(analysis.capturedAt))}</p></div>
    <button className="app-primary-action" disabled={blockedByActiveTrial || status === "starting"} onClick={resume} type="button">{blockedByActiveTrial ? "Finish active ProofWindow first" : status === "starting" ? "Starting…" : "Start 14-day ProofWindow →"}</button>
    {blockedByActiveTrial ? <small className="app-resume-note">BeautyProof keeps one active product trial at a time so the evidence does not overlap.</small> : null}
    {status === "error" ? <small>That baseline could not be resumed. Refresh and try again.</small> : null}
  </section>;
}
