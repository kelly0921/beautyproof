"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AnalysisOrigin, MetricVector, SkinAnalysis } from "@/lib/domain";
import { analysisOriginLabel } from "@/lib/provenance";

interface AnalysisPayload {
  ok: boolean;
  data?: { analysis: SkinAnalysis; result: { metrics: MetricVector }; origin: AnalysisOrigin; persistence: "memory" | "supabase" };
  error?: { message: string };
}

const metricOrder = ["hd_moisture", "hd_redness", "hd_texture", "hd_oiliness"] as const;
const metricNames = { hd_moisture: "Moisture", hd_redness: "Redness", hd_texture: "Texture", hd_oiliness: "Oiliness" };

function dateString(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number) { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; }

export function AppScanFlow() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "analyzing" | "ready" | "starting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [metrics, setMetrics] = useState<MetricVector | null>(null);

  async function analyze(mode: "upload" | "demo") {
    if (!consent) return;
    setStatus("analyzing");
    setMessage(mode === "upload" ? "Sending your image through the protected YouCam workflow…" : "Loading a simulated YouCam-format example…");
    try {
      let response: Response;
      if (mode === "demo") {
        response = await fetch("/api/skin-analysis/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "baseline", scenario: "keep", allowCachedFallback: true }) });
      } else {
        if (!file) throw new Error("Choose a high-resolution JPG or PNG first.");
        const form = new FormData();
        form.set("file", file);
        form.set("allowCachedFallback", "false");
        form.set("captureMode", "upload");
        response = await fetch("/api/skin-analysis/upload", { method: "POST", body: form });
      }
      const payload = await response.json() as AnalysisPayload;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message ?? "The analysis could not be completed.");
      setAnalysis(payload.data.analysis);
      setMetrics(payload.data.result.metrics);
      setStatus("ready");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The analysis could not be completed.");
    }
  }

  async function startWindow() {
    if (!analysis) return;
    setStatus("starting");
    setMessage("Creating your 14-day ProofWindow…");
    try {
      const start = new Date();
      const response = await fetch("/api/proof-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formulaVersionId: "formula-2026-us",
          claimId: "claim-hydration-2026",
          baselineAnalysisId: analysis.id,
          startDate: dateString(start),
          plannedEndDate: dateString(addDays(start, 14)),
          returnDeadline: dateString(addDays(start, 30)),
          status: "active",
        }),
      });
      const payload = await response.json() as { ok: boolean; data?: { id: string }; error?: { message: string } };
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message ?? "The ProofWindow could not be created.");
      router.push(`/app/trial/${payload.data.id}`);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The ProofWindow could not be created.");
    }
  }

  if ((status === "ready" || status === "starting") && metrics && analysis) {
    return (
      <div className="app-screen app-scan-screen">
        <div className="app-flow-steps" aria-label="ProofWindow setup progress"><span className="complete">1</span><i /><span className="complete">2</span><i /><span>3</span></div>
        <section className="app-result-hero"><span className="app-success-mark">✓</span><p className="app-kicker">Baseline saved</p><h1>Your starting skin is mapped.</h1><p>{analysis.origin === "synthetic" ? "These are simulated YouCam-format scores for demonstrating the workflow—not measurements from a real person." : "These are YouCam raw scores for comparison—not a diagnosis or beauty grade."}</p><span className="app-origin-badge"><i />{analysisOriginLabel(analysis.origin)}</span></section>
        <div className="app-metric-list">{metricOrder.map((metric) => <div className="app-metric-row" key={metric}><div><span>{metricNames[metric]}</span><small>raw score</small></div><strong>{metrics[metric].toFixed(1)}</strong><div className="app-metric-track"><i style={{ width: `${Math.max(4, Math.min(100, metrics[metric]))}%` }} /></div></div>)}</div>
        <section className="app-plan-preview"><div><p className="app-kicker">Selected proof lens</p><h2>Visible hydration in 14 days</h2><p>DewSignal Adaptive Serum · 2026 US Formula</p></div><div className="app-plan-days"><span><strong>0</strong>Baseline</span><i /><span><strong>7</strong>Check-in</span><i /><span><strong>14</strong>Follow-up</span></div></section>
        <button className="app-primary-action app-full-action" disabled={status === "starting"} onClick={startWindow} type="button">{status === "starting" ? "Starting your trial…" : "Start my 14-day ProofWindow"}<span>→</span></button>
        <button className="app-text-button" onClick={() => { setStatus("idle"); setAnalysis(null); setMetrics(null); }} type="button">Retake baseline</button>
      </div>
    );
  }

  return (
    <div className="app-screen app-scan-screen">
      <div className="app-flow-steps" aria-label="ProofWindow setup progress"><span className="complete">1</span><i /><span>2</span><i /><span>3</span></div>
      <header className="app-page-heading"><p className="app-kicker">New baseline</p><h1>Start with a clear picture.</h1><p>One front-facing image establishes the comparison point for this formula and claim.</p></header>
      <section className="app-selected-product"><div className="app-product-thumbnail"><i /></div><div><span>Aster Vale · fictional demo brand</span><strong>DewSignal Adaptive Serum</strong><small>2026 US Formula · hydration lens</small></div><span className="app-selected-check">✓</span></section>
      <section className="app-capture-card">
        <div className="app-face-guide" aria-hidden="true"><div className="app-face-oval"><span>Keep your face centered</span></div><span className="app-light-hint">☼ Even light · no filters</span></div>
        <div className="app-capture-controls">
          <div><p className="app-kicker">HD capture</p><h2>Choose a face photo</h2><p>JPG or PNG · under 10 MB · short side at least 1080 px.</p></div>
          <label className="app-file-picker"><input accept="image/jpeg,image/png" aria-label="Choose or take a photo" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /><span>Use your camera or photo library</span><strong>Choose or take a photo</strong></label>
          {file ? <p className="app-selected-photo"><span>Photo selected</span><strong>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</strong></p> : null}
          <label className="app-consent-row"><input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" /><span><strong>I consent to this skin analysis.</strong> The image is sent to YouCam for processing; BeautyProof stores numeric observations and provenance, not the face image.</span></label>
          <button className="app-primary-action app-full-action" disabled={!consent || !file || status === "analyzing"} onClick={() => analyze("upload")} type="button">{status === "analyzing" ? "Analyzing with YouCam…" : "Analyze my baseline"}<span>→</span></button>
          <button className="app-secondary-action app-full-action" disabled={!consent || status === "analyzing"} onClick={() => analyze("demo")} type="button">Try simulated demo fixture</button>
          {message ? <p aria-live="polite" className={status === "error" ? "app-error-message" : "app-status-message"}>{message}</p> : null}
        </div>
      </section>
      <p className="app-privacy-note">BeautyProof supports personal cosmetic observation only. It does not diagnose skin conditions or establish product causality.</p>
    </div>
  );
}
