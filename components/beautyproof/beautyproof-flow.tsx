"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { aggregateReceipts } from "@/lib/evidence/aggregates";
import { evidenceQuality, qualityLabel } from "@/lib/evidence/quality";
import { findComparableReceipts } from "@/lib/evidence/similarity";
import { determineVerdict } from "@/lib/evidence/verdict";
import { demoBaseline, demoFixtureDisclosure, demoFollowups, metricLabels } from "@/lib/demo";
import type { AnalysisOrigin, Experience, MetricVector, ProofReceiptRecord, SkinAnalysis, SyntheticReceipt } from "@/lib/domain";
import type { ProofWindowRecord } from "@/lib/data/repository";
import { claims, formulas, product, recommendation } from "@/lib/product";
import { seededReceipts } from "@/lib/seed";
import { CameraKitAdapter } from "@/lib/youcam/camera-kit";
import { SerumPackshot } from "./serum-packshot";

type FlowStep = "product" | "scan" | "proof-map" | "setup" | "progress" | "receipt" | "coverage";
type Scenario = "keep" | "swap" | "inconclusive";
type SourceMode = "preloaded" | "upload" | "live";

interface DemoState {
  scenario: Scenario;
  sourceMode: SourceMode;
  captureConsent: boolean;
  baselineReady: boolean;
  baselineAnalysisId: string | null;
  baselineProviderTaskId: string | null;
  baselineCapturedAt: string | null;
  baselineMetrics: MetricVector | null;
  baselineOrigin: AnalysisOrigin | null;
  followupAnalysisId: string | null;
  followupProviderTaskId: string | null;
  followupCapturedAt: string | null;
  followupMetrics: MetricVector | null;
  followupOrigin: AnalysisOrigin | null;
  proofWindowId: string | null;
  receipt: ProofReceiptRecord | null;
  persistenceMode: "memory" | "supabase" | null;
  checkinSaved: boolean;
  usedProduct: boolean;
  experience: Experience;
  confounder: boolean;
  timeJumped: boolean;
  receiptContributed: boolean;
  networkDelta: number;
}

const storageKey = "beautyproof-demo-state-v2";
const defaultState: DemoState = {
  scenario: "keep",
  sourceMode: "preloaded",
  captureConsent: false,
  baselineReady: false,
  baselineAnalysisId: null,
  baselineProviderTaskId: null,
  baselineCapturedAt: null,
  baselineMetrics: null,
  baselineOrigin: null,
  followupAnalysisId: null,
  followupProviderTaskId: null,
  followupCapturedAt: null,
  followupMetrics: null,
  followupOrigin: null,
  proofWindowId: null,
  receipt: null,
  persistenceMode: null,
  checkinSaved: false,
  usedProduct: true,
  experience: "good",
  confounder: false,
  timeJumped: false,
  receiptContributed: false,
  networkDelta: 0,
};

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { message?: string };
}

type AnalysisApiResponse = ApiResponse<{ result: { metrics: MetricVector }; analysis: SkinAnalysis; origin: AnalysisOrigin; persistence: "memory" | "supabase" }>;

const originLabels: Record<AnalysisOrigin, string> = {
  live_youcam: "Live YouCam Skin AI v2.1",
  cached_real_youcam: "Verified cached YouCam result",
  synthetic: "Simulated YouCam-format demo fixture",
};

async function cameraCaptureFile(image: string) {
  const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
  const blob = await (await fetch(imageUrl)).blob();
  return new File([blob], "beautyproof-camerakit.jpg", { type: blob.type || "image/jpeg" });
}

const stepPath: Record<FlowStep, string> = {
  product: "/products/dewsignal",
  scan: "/scan",
  "proof-map": "/proof-map",
  setup: "/proof-window/new",
  progress: "/proof-window/demo-window",
  receipt: "/proof-receipt/demo-receipt",
  coverage: "/proof-coverage",
};

const stepIndex: Record<FlowStep, number> = { product: 0, scan: 1, "proof-map": 2, setup: 3, progress: 3, receipt: 4, coverage: 4 };

function formatMetric(metric: keyof MetricVector) {
  return metricLabels[metric];
}

function dateAfter(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function Metrics({ values, deltas }: { values: MetricVector; deltas?: MetricVector }) {
  return (
    <div className="metric-grid" aria-label="YouCam raw-score observations">
      {(Object.keys(values) as (keyof MetricVector)[]).map((metric) => (
        <div className="metric-card" key={metric}>
          <small>{formatMetric(metric)} · raw score</small>
          <div className="metric-value">
            <strong>{values[metric].toFixed(1)}</strong>
            {deltas ? <span className={deltas[metric] >= 0 ? "delta-up" : "delta-down"}>{deltas[metric] >= 0 ? "+" : ""}{deltas[metric].toFixed(1)}</span> : null}
          </div>
          <div className="metric-bar" aria-hidden="true"><i style={{ width: `${values[metric]}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Progress({ step }: { step: FlowStep }) {
  const active = stepIndex[step];
  return (
    <>
      <div className="progress-rail" aria-label={`Demo progress: step ${active + 1} of 5`}>
        {[0, 1, 2, 3, 4].map((index) => <i className={`progress-segment ${index <= active ? "complete" : ""}`} key={index} />)}
      </div>
      <p className="progress-caption">Product → baseline → relevant proof → ProofWindow → ProofReceipt</p>
    </>
  );
}

function ScenarioBar({ state, setState, reset }: { state: DemoState; setState: React.Dispatch<React.SetStateAction<DemoState>>; reset: () => void }) {
  return (
    <div className="scenario-bar">
      <div><strong>Presentation controls</strong><div className="fine-print">Visible only in demo mode. Scenario changes trial metadata and cached follow-up.</div></div>
      <div className="scenario-controls" aria-label="Demo scenario">
        {(["keep", "swap", "inconclusive"] as Scenario[]).map((scenario) => (
          <button className={`scenario-button ${state.scenario === scenario ? "active" : ""}`} key={scenario} onClick={() => setState((current) => ({ ...current, scenario, followupAnalysisId: null, followupProviderTaskId: null, followupCapturedAt: null, followupMetrics: null, followupOrigin: null, receipt: null }))} type="button">{scenario}</button>
        ))}
        <button className="scenario-button" onClick={reset} type="button">Reset demo</button>
      </div>
    </div>
  );
}

function ClaimCompiler() {
  const labels = {
    youcam_observable: "Observable with YouCam",
    subjective: "Subjective",
    unsupported: "Not responsibly measurable",
  } as const;
  return (
    <section className="section-gap" aria-labelledby="claim-compiler-heading">
      <div className="split-heading">
        <div><p className="eyebrow">01 / Claim Compiler</p><h2 className="section-title" id="claim-compiler-heading">One product.<br />Three kinds of promise.</h2></div>
        <p className="lede">BeautyProof begins by saying what the measurement can—and cannot—responsibly observe.</p>
      </div>
      <div className="claim-grid">
        {claims.map((claim, index) => {
          const statusClass = claim.type === "youcam_observable" ? "status-observable" : claim.type === "subjective" ? "status-subjective" : "status-unsupported";
          return (
            <article className={`claim-card ${index === 0 ? "selected" : ""}`} key={claim.id}>
              <span className="claim-index">0{index + 1}</span>
              <span className={`claim-status ${statusClass}`}>{labels[claim.type as keyof typeof labels]}</span>
              <h3>{claim.text}</h3>
              <p>{claim.explanation}</p>
              <button aria-pressed={index === 0} className="claim-select" disabled={index !== 0} type="button">{index === 0 ? "Selected proof lens" : index === 1 ? "Collected in check-ins" : "Boundary preserved"}</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductStep({ go }: { go: (step: FlowStep) => void }) {
  return (
    <main className="page">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">A new skincare review standard</p>
          <h1 className="display">Skincare reviews from people whose skin <em>started like yours.</em></h1>
          <p className="lede">Generic stars hide the claim, formula, and starting condition. BeautyProof replaces them with comparable, formula-specific personal observations.</p>
          <p className="origin-chip">Fictional hackathon catalog · Aster Vale, DewSignal, its price, rating, formulas, and claims are demonstration data.</p>
          <div className="button-row">
            <button className="primary-button" onClick={() => go("scan")} type="button">See proof for my starting skin <span aria-hidden="true">→</span></button>
            <span className="fine-print">One guided baseline · cosmetic observation only</span>
          </div>
          <div className="hero-points">
            <div className="hero-point"><strong>{product.genericRating}</strong><span>generic stars</span></div>
            <div className="hero-point"><strong>{product.genericReviewCount.toLocaleString()}</strong><span>context-free reviews</span></div>
            <div className="hero-point"><strong>0</strong><span>starting baselines shown</span></div>
          </div>
        </div>
        <div>
          <SerumPackshot />
          <div className="button-row" style={{ justifyContent: "space-between", marginTop: 14 }}>
            <strong>{product.brandName} · {product.name}</strong><span>${(product.priceCents / 100).toFixed(0)} · {formulas[1].versionLabel}</span>
          </div>
        </div>
      </section>
      <ClaimCompiler />
      <section className="section-gap panel panel-pad">
        <p className="eyebrow">Recommendation context</p>
        <div className="split-heading" style={{ marginBottom: 0 }}>
          <div><h3 className="subhead">{recommendation.sourceName}</h3><p className="muted">{recommendation.copy}</p></div>
          <span className="origin-chip">Fictional source · formula locked</span>
        </div>
      </section>
    </main>
  );
}

function ScanStep({ state, setState, go }: { state: DemoState; setState: React.Dispatch<React.SetStateAction<DemoState>>; go: (step: FlowStep) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisState, setAnalysisState] = useState<"idle" | "analyzing" | "error">("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");

  const processBaseline = async () => {
    if (!state.captureConsent) return;
    setAnalysisState("analyzing");
    setAnalysisMessage(state.sourceMode === "preloaded" ? "Loading the sanitized YouCam result…" : "Running the server-side YouCam Skin AI workflow…");
    try {
      let response: Response;
      if (state.sourceMode === "preloaded") {
        response = await fetch("/api/skin-analysis/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "baseline", scenario: state.scenario, allowCachedFallback: true }),
        });
      } else {
        let file = selectedFile;
        if (state.sourceMode === "live") {
          const capture = await new CameraKitAdapter().capture();
          file = await cameraCaptureFile(capture.image);
        }
        if (!file) throw new Error("Choose a high-resolution JPG or PNG before analysis.");
        const form = new FormData();
        form.set("file", file);
        form.set("allowCachedFallback", "false");
        form.set("captureMode", state.sourceMode === "live" ? "hdskincare" : "upload");
        response = await fetch("/api/skin-analysis/upload", { method: "POST", body: form });
      }

      const payload = await response.json() as AnalysisApiResponse;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message || "YouCam analysis could not be completed.");
      setState((current) => ({
        ...current,
        baselineReady: true,
        baselineAnalysisId: payload.data!.analysis.id,
        baselineProviderTaskId: payload.data!.analysis.providerTaskId ?? null,
        baselineCapturedAt: payload.data!.analysis.capturedAt,
        baselineMetrics: payload.data!.result.metrics,
        baselineOrigin: payload.data!.origin,
        followupAnalysisId: null,
        followupProviderTaskId: null,
        followupCapturedAt: null,
        followupMetrics: null,
        followupOrigin: null,
        proofWindowId: null,
        receipt: null,
        persistenceMode: payload.data!.persistence,
      }));
      go("proof-map");
    } catch (error) {
      setAnalysisState("error");
      setAnalysisMessage(error instanceof Error ? error.message : "YouCam analysis could not be completed.");
    }
  };
  return (
    <main className="page page-narrow">
      <Progress step="scan" />
      <div className="step-heading"><p className="eyebrow">02 / Starting measurement</p><h1 className="section-title">Begin with a baseline.</h1><p className="lede">This first scan is a starting measurement—not a diagnosis, beauty grade, or long-term personal normal.</p></div>
      <div className="scan-layout">
        <div className="capture-frame">
          <span className="capture-pill">HD capture guidance active</span>
          <div className="face-oval"><span className="face-initials">K</span></div>
        </div>
        <div>
          <div className="scan-options">
            <button className={`source-choice ${state.sourceMode === "preloaded" ? "active" : ""}`} onClick={() => setState((current) => ({ ...current, sourceMode: "preloaded" }))} type="button"><strong>Simulated demo fixture</strong><span>Reliable judge path · synthetic origin · no real person</span></button>
            <button className={`source-choice ${state.sourceMode === "upload" ? "active" : ""}`} onClick={() => setState((current) => ({ ...current, sourceMode: "upload" }))} type="button"><strong>High-resolution upload</strong><span>JPG or PNG · under 10 MB · short side at least 1080 px</span></button>
            <button className={`source-choice ${state.sourceMode === "live" ? "active" : ""}`} onClick={() => setState((current) => ({ ...current, sourceMode: "live" }))} type="button"><strong>Live CameraKit</strong><span>Uses hdskincare mode when licensed SDK and device support are available</span></button>
          </div>
          {state.sourceMode === "upload" ? <label className="upload-field"><strong>Image for live YouCam analysis</strong><input accept="image/jpeg,image/png" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} type="file" /><span>{selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : "No image selected"}</span></label> : null}
          <label className="consent-box">
            <input checked={state.captureConsent} onChange={(event) => setState((current) => ({ ...current, captureConsent: event.target.checked }))} type="checkbox" />
            <span><strong>I consent to cosmetic image analysis.</strong><br />The image is used only for YouCam processing, is not sent to unrelated AI services, and is not retained by this demo after numeric results are returned.</span>
          </label>
          <button className="primary-button button-wide" disabled={!state.captureConsent || analysisState === "analyzing" || (state.sourceMode === "upload" && !selectedFile)} onClick={processBaseline} type="button">{analysisState === "analyzing" ? "Analyzing with YouCam…" : state.baselineReady ? "Starting measurement ready" : state.sourceMode === "preloaded" ? "Use preloaded baseline" : state.sourceMode === "upload" ? "Analyze image with YouCam" : "Open CameraKit"}</button>
          {analysisMessage ? <p aria-live="polite" className={analysisState === "error" ? "scan-error" : "analysis-status"}>{analysisMessage}</p> : null}
          <p className="fine-print">Helpful errors are returned for permission denial, low resolution, a small or out-of-bounds face, dark lighting, task failure, and polling timeout.</p>
        </div>
      </div>
    </main>
  );
}

function ProofMapStep({ state, go }: { state: DemoState; go: (step: FlowStep) => void }) {
  const baseline = state.baselineMetrics ?? demoBaseline;
  const match = findComparableReceipts({ baseline, formulaVersionId: product.currentFormulaId, claim: claims[0], receipts: seededReceipts });
  const [aggregate, setAggregate] = useState(() => aggregateReceipts(seededReceipts, product.currentFormulaId, claims[0].id));
  const [publicContributedReceipts, setPublicContributedReceipts] = useState(0);
  const [publicContributedDemoReceipts, setPublicContributedDemoReceipts] = useState(0);
  const historical = aggregateReceipts(seededReceipts, product.priorFormulaId, claims[0].id);
  useEffect(() => {
    void fetch(`/api/proof-map?formulaVersionId=${product.currentFormulaId}&claimId=${claims[0].id}`)
      .then(async (response) => await response.json() as { ok: boolean; data?: { aggregate: ReturnType<typeof aggregateReceipts>; publicContributedReceipts: number; publicContributedDemoReceipts: number } })
      .then((payload) => {
        if (payload.ok && payload.data) {
          setAggregate(payload.data.aggregate);
          setPublicContributedReceipts(payload.data.publicContributedReceipts);
          setPublicContributedDemoReceipts(payload.data.publicContributedDemoReceipts);
        }
      });
  }, []);
  const representative = [
    match.comparables.find(({ receipt }) => receipt.verdict === "keep")?.receipt,
    match.comparables.find(({ receipt }) => receipt.verdict === "swap" || receipt.verdict === "return")?.receipt,
    seededReceipts.find((receipt) => receipt.formulaVersionId === product.currentFormulaId && receipt.verdict === "inconclusive"),
  ].filter(Boolean) as SyntheticReceipt[];
  return (
    <main className="page">
      <Progress step="proof-map" />
      <div className="step-heading"><p className="eyebrow">03 / Personalized ProofMap</p><h1 className="section-title">Stars, recompiled as relevant evidence.</h1><p className="lede">Selected claim: <strong>{claims[0].text}</strong> · Exact formula: <strong>{formulas[1].versionLabel}</strong></p></div>
      <span className="origin-chip">{state.baselineOrigin === "live_youcam" ? "Live result returned by YouCam Skin AI v2.1 through the server integration." : demoFixtureDisclosure}</span>
      {publicContributedReceipts ? <p className="toast">Shopper ProofMap includes {publicContributedReceipts - publicContributedDemoReceipts} verified and {publicContributedDemoReceipts} simulated consented campaign receipt{publicContributedReceipts === 1 ? "" : "s"}; their origins remain separate.</p> : null}
      <div style={{ marginTop: 16 }}><Metrics values={baseline} /></div>
      <section className="section-gap transformation" aria-label="Generic rating transformed into personalized evidence">
        <div className="old-stars"><div className="star-line">★★★★★</div><strong>{product.genericRating}</strong><span>{product.genericReviewCount.toLocaleString()} reviews · formula and baseline unknown</span></div>
        <div className="transform-arrow" aria-hidden="true">→</div>
        <div className="proof-map-total"><strong>{match.comparables.length}</strong><div><div className="proof-node-line" /><div className="proof-node-label">comparable starting records · same claim · current formula only</div></div></div>
      </section>
      <div className="cohort-grid">
        <section className="panel panel-pad">
          <p className="eyebrow">Decision mix</p><h2 className="subhead">What these personal trials decided</h2>
          <div className="verdict-list" style={{ marginTop: 24 }}>
            {(Object.entries(aggregate.byVerdict) as [string, number][]).map(([verdict, count]) => (
              <div className="verdict-row" key={verdict}><span>{verdict}</span><div className="mini-bar"><i style={{ width: `${aggregate.total ? (count / aggregate.total) * 100 : 0}%` }} /></div><strong>{count}</strong></div>
            ))}
          </div>
          <p className="fine-print">{match.explanation} No biological-match percentage is shown.</p>
        </section>
        <section>
          <p className="eyebrow">Individual evidence first</p>
          {match.scarcity ? <p className="toast">Only {match.comparables.length} relevant ProofReceipts are available. Review them individually or start your own ProofWindow.</p> : null}
          <div className="receipt-stack">
            {representative.map((receipt, index) => (
              <article className="mini-receipt" key={receipt.id}>
                <span className="origin-chip">Synthetic demo record</span>
                <strong className="mini-verdict">{receipt.verdict}</strong>
                <p>Moisture began at {receipt.baseline.hd_moisture.toFixed(1)} and moved {receipt.followup.hd_moisture - receipt.baseline.hd_moisture >= 0 ? "+" : ""}{(receipt.followup.hd_moisture - receipt.baseline.hd_moisture).toFixed(1)} raw-score points.</p>
                <footer>{index === 2 ? "Inconclusive evidence preserved" : receipt.sensoryNote} · {receipt.evidenceQuality} evidence</footer>
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="section-gap">
        <div className="split-heading"><div><p className="eyebrow">Formula Reset</p><h2 className="section-title">The product name stayed the same.<br />The evidence did not.</h2></div><p className="lede">When the formula changes, the proof resets. Historical receipts remain visible but are excluded from the current aggregate.</p></div>
        <div className="formula-reset">
          <div className="formula-side"><span className="tag">Historical · excluded by default</span><div className="formula-count">{historical.total}</div><h3>{formulas[0].versionLabel}</h3><ul><li>{formulas[0].formulaSummary}</li><li>Preserved for deliberate historical inspection</li></ul></div>
          <div className="formula-side current"><span className="tag">Current evidence pool</span><div className="formula-count">{aggregate.total}</div><h3>{formulas[1].versionLabel}</h3><ul><li>{formulas[1].formulaSummary}</li><li>Must earn formula-specific receipts</li></ul></div>
        </div>
      </section>
      <div className="section-gap button-row"><button className="primary-button" onClick={() => go("setup")} type="button">Start my hydration ProofWindow <span aria-hidden="true">→</span></button><span className="fine-print">Every product has to earn its place on your shelf.</span></div>
      <p className="fine-print">This screen starts with synthetic demonstration records. Only explicitly consented receipts from verified live or cached YouCam analyses count as real user evidence.</p>
    </main>
  );
}

function SetupStep({ state, setState, openWindow }: { state: DemoState; setState: React.Dispatch<React.SetStateAction<DemoState>>; openWindow: (id: string) => void }) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const startWindow = async () => {
    if (!state.baselineAnalysisId) {
      setSaveState("error");
      setSaveMessage("Return to the baseline step and create a stored analysis first.");
      return;
    }
    setSaveState("saving");
    setSaveMessage("Creating a formula- and claim-locked ProofWindow…");
    try {
      const response = await fetch("/api/proof-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formulaVersionId: product.currentFormulaId,
          claimId: claims[0].id,
          baselineAnalysisId: state.baselineAnalysisId,
          startDate: dateAfter(0),
          plannedEndDate: dateAfter(14),
          returnDeadline: dateAfter(product.returnPolicyDays),
          status: "active",
        }),
      });
      const payload = await response.json() as ApiResponse<ProofWindowRecord>;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message || "The ProofWindow could not be created.");
      setState((current) => ({ ...current, proofWindowId: payload.data!.id, checkinSaved: false, timeJumped: false, receipt: null }));
      openWindow(payload.data.id);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "The ProofWindow could not be created.");
    }
  };
  return (
    <main className="page page-narrow">
      <Progress step="setup" />
      <div className="step-heading"><p className="eyebrow">04 / ProofWindow</p><h1 className="section-title">A claim-aligned personal observation plan.</h1><p className="lede">Coordinated around the product’s 14-day claim and return deadline. This is not a clinical protocol.</p></div>
      <div className="plan-grid">
        <div className="plan-summary"><p className="eyebrow" style={{ color: "#d7c3cb" }}>Testing one new variable</p><strong>{product.name}</strong><dl><dt>Exact formula</dt><dd>{formulas[1].versionLabel}</dd><dt>Claim</dt><dd>{claims[0].text}</dd><dt>Starting source</dt><dd>{state.baselineOrigin ? originLabels[state.baselineOrigin] : originLabels.synthetic}</dd></dl></div>
        <div className="panel panel-pad"><h2 className="subhead">Your observation window</h2><div className="timeline"><div className="timeline-point"><i>0</i><strong>Baseline</strong><br /><small>Starting scan</small></div><div className="timeline-point"><i>7</i><strong>Check</strong><br /><small>Sensory + use</small></div><div className="timeline-point"><i>14</i><strong>Follow-up</strong><br /><small>Claim checkpoint</small></div></div><div className="deadline-strip">Return deadline · 16 days after the final checkpoint</div><p className="fine-print">Keep cleanser, moisturizer, and sunscreen reasonably stable. Record meaningful changes rather than chasing a daily skin score.</p><button className="primary-button button-wide" disabled={saveState === "saving" || !state.baselineAnalysisId} onClick={startWindow} type="button">{saveState === "saving" ? "Creating ProofWindow…" : "Start this ProofWindow"}</button>{saveMessage ? <p aria-live="polite" className={saveState === "error" ? "scan-error" : "analysis-status"}>{saveMessage}</p> : null}</div>
      </div>
    </main>
  );
}

function ProgressStep({ state, setState, openReceipt }: { state: DemoState; setState: React.Dispatch<React.SetStateAction<DemoState>>; openReceipt: (id: string) => void }) {
  const [analysisState, setAnalysisState] = useState<"idle" | "analyzing" | "error">("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [checkinState, setCheckinState] = useState<"idle" | "saving" | "error">("idle");
  const [checkinMessage, setCheckinMessage] = useState("");
  const [followupMode, setFollowupMode] = useState<SourceMode>(state.baselineOrigin === "live_youcam" ? "upload" : "preloaded");
  const [selectedFollowupFile, setSelectedFollowupFile] = useState<File | null>(null);

  const saveCheckin = async () => {
    if (!state.proofWindowId) {
      setCheckinState("error");
      setCheckinMessage("Start a stored ProofWindow before saving a check-in.");
      return;
    }
    setCheckinState("saving");
    setCheckinMessage("Saving check-in to this ProofWindow…");
    try {
      const response = await fetch(`/api/proof-windows/${encodeURIComponent(state.proofWindowId)}/check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateAfter(7), usedProduct: state.usedProduct, experience: state.experience, confounderNote: state.confounder ? "Routine or environment changed during the observation window." : undefined }),
      });
      const payload = await response.json() as ApiResponse<ProofWindowRecord>;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message || "The check-in could not be saved.");
      setState((current) => ({ ...current, checkinSaved: true }));
      setCheckinState("idle");
      setCheckinMessage("");
    } catch (error) {
      setCheckinState("error");
      setCheckinMessage(error instanceof Error ? error.message : "The check-in could not be saved.");
    }
  };

  const analyzeFollowup = async () => {
    if (!state.proofWindowId) {
      setAnalysisState("error");
      setAnalysisMessage("Start a stored ProofWindow before completing the follow-up.");
      return;
    }
    setAnalysisState("analyzing");
    setAnalysisMessage(followupMode === "preloaded" ? "Loading the sanitized YouCam follow-up…" : "Running the second server-side YouCam Skin AI analysis…");
    try {
      let response: Response;
      if (followupMode === "preloaded") {
        response = await fetch("/api/skin-analysis/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "followup", scenario: state.scenario, allowCachedFallback: true }),
        });
      } else {
        let file = selectedFollowupFile;
        if (followupMode === "live") {
          const capture = await new CameraKitAdapter().capture();
          file = await cameraCaptureFile(capture.image);
        }
        if (!file) throw new Error("Choose a high-resolution follow-up JPG or PNG before analysis.");
        const form = new FormData();
        form.set("file", file);
        form.set("allowCachedFallback", "false");
        form.set("captureMode", followupMode === "live" ? "hdskincare" : "upload");
        response = await fetch("/api/skin-analysis/upload", { method: "POST", body: form });
      }
      const payload = await response.json() as AnalysisApiResponse;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message || "The follow-up could not be analyzed.");

      const completionResponse = await fetch(`/api/proof-windows/${encodeURIComponent(state.proofWindowId)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: state.scenario, followupAnalysisId: payload.data.analysis.id, completedUses: 13, experience: state.experience, majorConfounder: state.confounder, demoTimeJump: state.timeJumped }),
      });
      const completion = await completionResponse.json() as ApiResponse<{ receipt: ProofReceiptRecord; persistence: "memory" | "supabase" }>;
      if (!completionResponse.ok || !completion.ok || !completion.data) throw new Error(completion.error?.message || "The ProofReceipt could not be generated.");
      setState((current) => ({
        ...current,
        followupAnalysisId: payload.data!.analysis.id,
        followupProviderTaskId: payload.data!.analysis.providerTaskId ?? null,
        followupCapturedAt: payload.data!.analysis.capturedAt,
        followupMetrics: payload.data!.result.metrics,
        followupOrigin: payload.data!.origin,
        receipt: completion.data!.receipt,
        persistenceMode: payload.data!.persistence,
      }));
      openReceipt(completion.data.receipt.id);
    } catch (error) {
      setAnalysisState("error");
      setAnalysisMessage(error instanceof Error ? error.message : "The follow-up could not be analyzed.");
    }
  };
  return (
    <main className="page page-narrow">
      <Progress step="progress" />
      <div className="step-heading"><p className="eyebrow">04 / Day {state.timeJumped ? "14" : "7"}</p><h1 className="section-title">A check-in under ten seconds.</h1><p className="lede">Measured observations and sensory experience stay separate.</p></div>
      <section className="panel panel-pad checkin">
        <div className="check-question"><strong>Did you use the product?</strong><div className="choices">{[true, false].map((value) => <button aria-pressed={state.usedProduct === value} className={`choice-button ${state.usedProduct === value ? "active" : ""}`} key={String(value)} onClick={() => setState((current) => ({ ...current, usedProduct: value }))} type="button">{value ? "Yes" : "No"}</button>)}</div></div>
        <div className="check-question"><strong>How did it feel?</strong><div className="choices">{(["good", "neutral", "concern"] as Experience[]).map((value) => <button aria-pressed={state.experience === value} className={`choice-button ${state.experience === value ? "active" : ""}`} key={value} onClick={() => setState((current) => ({ ...current, experience: value }))} type="button">{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div>
        <div className="check-question"><strong>Did anything else change?</strong><div className="choices">{[false, true].map((value) => <button aria-pressed={state.confounder === value} className={`choice-button ${state.confounder === value ? "active" : ""}`} key={String(value)} onClick={() => setState((current) => ({ ...current, confounder: value }))} type="button">{value ? "Add note" : "No"}</button>)}</div></div>
        <button className="primary-button button-wide" disabled={checkinState === "saving" || state.checkinSaved} onClick={saveCheckin} type="button">{state.checkinSaved ? "Check-in saved ✓" : checkinState === "saving" ? "Saving check-in…" : "Save check-in"}</button>
        {checkinMessage ? <p aria-live="polite" className={checkinState === "error" ? "scan-error" : "analysis-status"}>{checkinMessage}</p> : null}
      </section>
      <section className="time-jump">
        <p className="eyebrow">Presentation shortcut · demo only</p>
        <h2 className="subhead">Advance from Day 7 to Day 14</h2>
      <p className="fine-print">This labeled control changes demo time and trial metadata. It does not alter either measurement, and the resulting receipt remains synthetic because the protocol duration did not actually elapse.</p>
        {!state.timeJumped ? <button className="secondary-button" disabled={!state.checkinSaved} onClick={() => setState((current) => ({ ...current, timeJumped: true }))} type="button">Demo time jump → Day 14</button> : <>
          <div className="followup-source">
            <p className="eyebrow">Second measurement source</p>
            <div className="scan-options">
              <button className={`source-choice ${followupMode === "preloaded" ? "active" : ""}`} onClick={() => setFollowupMode("preloaded")} type="button"><strong>Simulated demo follow-up</strong><span>Reliable judge path · synthetic origin · no real person</span></button>
              <button className={`source-choice ${followupMode === "upload" ? "active" : ""}`} onClick={() => setFollowupMode("upload")} type="button"><strong>High-resolution follow-up upload</strong><span>Runs the second live YouCam Skin AI task</span></button>
              <button className={`source-choice ${followupMode === "live" ? "active" : ""}`} onClick={() => setFollowupMode("live")} type="button"><strong>Live CameraKit follow-up</strong><span>Uses hdskincare mode when the licensed SDK is available</span></button>
            </div>
            {followupMode === "upload" ? <label className="upload-field"><strong>Follow-up image for live YouCam analysis</strong><input accept="image/jpeg,image/png" onChange={(event) => setSelectedFollowupFile(event.target.files?.[0] ?? null)} type="file" /><span>{selectedFollowupFile ? `${selectedFollowupFile.name} · ${(selectedFollowupFile.size / 1024 / 1024).toFixed(1)} MB` : "No follow-up image selected"}</span></label> : null}
          </div>
          <button className="primary-button" disabled={analysisState === "analyzing" || (followupMode === "upload" && !selectedFollowupFile)} onClick={analyzeFollowup} type="button">{analysisState === "analyzing" ? "Analyzing follow-up…" : followupMode === "preloaded" ? <>Use simulated follow-up <span aria-hidden="true">→</span></> : followupMode === "upload" ? <>Analyze live follow-up <span aria-hidden="true">→</span></> : <>Open CameraKit and analyze <span aria-hidden="true">→</span></>}</button>
        </>}
        {analysisMessage ? <p aria-live="polite" className={analysisState === "error" ? "scan-error" : "analysis-status"}>{analysisMessage}</p> : null}
      </section>
    </main>
  );
}

function ReceiptStep({ state, contribute }: { state: DemoState; contribute: () => Promise<void> }) {
  const [contributionState, setContributionState] = useState<"idle" | "saving" | "error">("idle");
  const [contributionMessage, setContributionMessage] = useState("");
  const baseline = state.receipt?.baseline ?? state.baselineMetrics ?? demoBaseline;
  const followup = state.receipt?.followup ?? state.followupMetrics ?? demoFollowups[state.scenario];
  const deltas = Object.fromEntries((Object.keys(baseline) as (keyof MetricVector)[]).map((metric) => [metric, followup[metric] - baseline[metric]])) as MetricVector;
  const fallbackQuality = evidenceQuality({ exactFormula: true, durationComplete: state.scenario !== "inconclusive", adherenceRate: state.scenario === "inconclusive" ? 0.54 : 13 / 14, routineStable: !state.confounder, majorConfounder: state.confounder || state.scenario === "inconclusive", capturesValid: state.scenario !== "inconclusive" });
  const quality = state.receipt ? { quality: state.receipt.evidenceQuality, score: state.receipt.evidenceScore, reasons: state.receipt.evidenceReasons } : fallbackQuality;
  const fallbackVerdict = determineVerdict({ quality: quality.quality, durationComplete: state.scenario !== "inconclusive", experience: state.scenario === "swap" ? "neutral" : state.experience, primaryMetricDelta: deltas.hd_moisture, beforeReturnDeadline: true, strongerAlternativeAvailable: state.scenario === "swap" });
  const verdict = state.receipt ? { verdict: state.receipt.verdict, explanation: state.receipt.verdictExplanation } : fallbackVerdict;
  const contributeReceipt = async () => {
    setContributionState("saving");
    setContributionMessage("Adding the numeric receipt to Proof Coverage…");
    try {
      await contribute();
    } catch (error) {
      setContributionState("error");
      setContributionMessage(error instanceof Error ? error.message : "The receipt could not be contributed.");
    }
  };
  return (
    <main className="page">
      <Progress step="receipt" />
      <div className="step-heading" style={{ textAlign: "center" }}><p className="eyebrow">05 / Your ProofReceipt</p><h1 className="section-title">Not a universal product score.<br />A transparent personal decision.</h1></div>
      <div className="receipt-wrap">
        <article className="receipt" aria-label={`BeautyProof ProofReceipt verdict ${verdict.verdict}`}>
          <div className="receipt-head"><div><div className="receipt-wordmark">BeautyProof / ProofReceipt</div><div className="receipt-id">{state.receipt?.id ?? "BP-DS-2026-KC-014"} · PERSONAL COSMETIC OBSERVATION</div></div><div className="verdict-stamp">{verdict.verdict.toUpperCase()}</div></div>
          <h1>{product.name}</h1><p className="receipt-formula">{product.brandName} · {formulas[1].versionLabel} · fingerprint {formulas[1].fingerprint}</p>
          <div className="receipt-claim"><small>Claim evaluated</small><strong>{claims[0].text}</strong></div>
          <div className="receipt-metrics">
            {(Object.keys(baseline) as (keyof MetricVector)[]).map((metric) => <div className="receipt-metric" key={metric}><strong>{formatMetric(metric)} raw score</strong><span>{baseline[metric].toFixed(1)} start</span><span>{followup[metric].toFixed(1)} follow-up</span><span className={deltas[metric] >= 0 ? "delta-up" : "delta-down"}>{deltas[metric] >= 0 ? "+" : ""}{deltas[metric].toFixed(1)}</span></div>)}
          </div>
          <div className="receipt-facts"><div className="receipt-fact"><small>Trial</small><strong>{state.scenario === "inconclusive" ? "7 / 14 days" : "14 / 14 days"}</strong></div><div className="receipt-fact"><small>Completed uses</small><strong>{state.scenario === "inconclusive" ? "7 / 14" : "13 / 14"}</strong></div><div className="receipt-fact"><small>Return time</small><strong>16 days left</strong></div></div>
          <div className="receipt-note"><strong>Subjective experience:</strong> {state.receipt?.sensoryNote ?? (state.scenario === "swap" ? "Lightweight, but recurring pilling under sunscreen." : state.scenario === "inconclusive" ? "Neutral; routine changed during the window." : "Lightweight and comfortable; occasional pilling under sunscreen.")}</div>
          <div className="receipt-note"><strong>Evidence quality:</strong> {qualityLabel[quality.quality]} · {quality.score}/100 internal rubric</div>
          <div className="quality-reasons">{quality.reasons.map((reason) => <span className="quality-reason" key={reason.label} style={{ opacity: reason.earned ? 1 : .45 }}>{reason.earned ? reason.label : `Not met: ${reason.label}`}</span>)}</div>
          <div className="receipt-note"><strong>Why {verdict.verdict}:</strong> {verdict.explanation}</div>
          <div className="receipt-note"><strong>Limitation:</strong> These are cosmetic image observations during a personal trial. They do not establish that the product caused a change and are not medical diagnosis, clinical proof, or scientific efficacy verification.</div>
          <div className="evidence-ledger" aria-label="YouCam evidence provenance">
            <div><small>Baseline analysis</small><strong>{state.baselineProviderTaskId ?? state.baselineAnalysisId ?? "demo fixture"}</strong><span>{state.baselineOrigin ? originLabels[state.baselineOrigin] : originLabels.synthetic}</span></div>
            <div><small>Follow-up analysis</small><strong>{state.followupProviderTaskId ?? state.followupAnalysisId ?? "demo fixture"}</strong><span>{state.followupOrigin ? originLabels[state.followupOrigin] : originLabels.synthetic}</span></div>
          </div>
          <div className="receipt-footer"><span>Stored ProofWindow: {state.proofWindowId ?? "demo-window"}</span><span>Generated {state.receipt ? new Date(state.receipt.createdAt).toLocaleString() : "Aug 4, 2026"}</span></div>
        </article>
      </div>
      <section className="network-consent">
        <p className="eyebrow" style={{ color: "#d7c3cb" }}>Consent-controlled network update</p><h2 className="subhead">Help the next shopper who starts here.</h2><p>By choosing the action below, you explicitly consent to aggregate this receipt’s formula, claim, numeric observations, quality, and verdict. No face image is contributed.</p>
        <button className="primary-button" disabled={state.receiptContributed || contributionState === "saving" || !state.receipt} onClick={contributeReceipt} type="button">{state.receiptContributed ? "Receipt contributed ✓" : contributionState === "saving" ? "Contributing receipt…" : "I consent — add my ProofReceipt"}</button>
        {contributionMessage ? <p aria-live="polite" className={contributionState === "error" ? "scan-error" : "analysis-status"}>{contributionMessage}</p> : null}
      </section>
    </main>
  );
}

function CoverageStep({ state }: { state: DemoState }) {
  const aggregate = aggregateReceipts(seededReceipts, product.currentFormulaId);
  const contributedDemo = state.receiptContributed && state.receipt?.origin === "synthetic" ? 1 : 0;
  const total = aggregate.total + state.networkDelta + contributedDemo;
  const keepCount = aggregate.byVerdict.keep + (state.receiptContributed && state.scenario === "keep" ? 1 : 0);
  return (
    <main className="page page-narrow">
      <Progress step="coverage" />
      {state.receiptContributed ? <div className="toast">Network updated: the consented receipt is reflected below with its {state.receipt?.origin === "synthetic" ? "synthetic demo" : "verified real"} origin attached.</div> : null}
      <div className="step-heading"><p className="eyebrow">Proof Coverage / Prototype business view</p><h1 className="section-title">Where evidence is strong—and where it is still missing.</h1><p className="lede">The same consented records power the consumer ProofMap and this compact retailer-facing view.</p></div>
      <div className="coverage-grid">
        <section className="coverage-card"><p className="eyebrow">Current formula receipts</p><div className="coverage-number">{total}</div><p className="muted">Across consented claims · {formulas[1].versionLabel}</p></section>
        <section className="coverage-card"><p className="eyebrow">Origin disclosure</p><div className="origin-split"><div className="origin-cell"><strong>{state.networkDelta}</strong><span>verified user evidence</span></div><div className="origin-cell"><strong>{aggregate.byOrigin.synthetic + contributedDemo}</strong><span>synthetic / demo</span></div></div></section>
        <section className="coverage-card wide"><p className="eyebrow">Decision mix</p><div className="coverage-bars">{(["keep", "swap", "continue", "pause", "return", "inconclusive"] as const).map((verdict) => { const count = verdict === "keep" ? keepCount : aggregate.byVerdict[verdict] + (state.receiptContributed && state.scenario === verdict ? 1 : 0); return <div className="coverage-row" key={verdict}><span>{verdict}</span><div className="mini-bar"><i style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></div><strong>{count}</strong></div>; })}</div></section>
        <section className="coverage-card"><p className="eyebrow">Receipts by claim</p><h2 className="subhead">Hydration leads</h2><p className="muted">Current-formula hydration has the deepest observation set. Sensory finish remains self-reported; barrier repair is not measured.</p></section>
        <section className="coverage-card"><p className="eyebrow">Evidence gap</p><h2 className="subhead">Low-moisture starting band</h2><p className="muted">Only three usable current-formula records begin below a 45 moisture raw score. Recruit observations; do not infer certainty.</p></section>
        <section className="coverage-card"><p className="eyebrow">Proof Loop persistence</p><h2 className="subhead">{state.persistenceMode === "supabase" ? "Durable Supabase" : "Active-process demo"}</h2><p className="muted">{state.persistenceMode === "supabase" ? "Analyses, windows, check-ins, receipts, and consent survive application restarts." : "Configure the server-only Supabase environment to make records restart-safe."}</p></section>
      </div>
      <p className="hypothesis" style={{ marginTop: 18 }}><strong>Prototype insight, not guaranteed commercial impact:</strong> formula-specific evidence may support more informed purchases and more relevant swaps, but revenue and return effects require real-world validation.</p>
      <p className="fine-print">Synthetic records illustrate future network scale. They remain separate from verified live or cached YouCam user evidence in every aggregate.</p>
      <div className="button-row" style={{ marginTop: 28 }}><Link className="primary-button" href="/demo">Run the demo again</Link><Link className="ghost-button" href="/products/dewsignal">Return to product</Link></div>
    </main>
  );
}

export function BeautyProofFlow({ initialStep, showDemoControls = false }: { initialStep: FlowStep; showDemoControls?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<DemoState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setState({ ...defaultState, ...(JSON.parse(stored) as Partial<DemoState>) });
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [hydrated, state]);

  const go = (step: FlowStep) => router.push(stepPath[step]);
  const openWindow = (id: string) => router.push(`/proof-window/${encodeURIComponent(id)}`);
  const openReceipt = (id: string) => router.push(`/proof-receipt/${encodeURIComponent(id)}`);
  const reset = () => {
    void fetch("/api/demo/reset", { method: "POST" });
    setState(defaultState);
    window.localStorage.removeItem(storageKey);
    router.push("/products/dewsignal");
  };
  const contribute = async () => {
    if (!state.receipt) throw new Error("Complete and store a ProofReceipt before contributing it.");
    const response = await fetch(`/api/proof-receipts/${encodeURIComponent(state.receipt.id)}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }),
    });
    const payload = await response.json() as ApiResponse<{ consented: boolean; networkDelta: number }>;
    if (!response.ok || !payload.ok || !payload.data?.consented) throw new Error(payload.error?.message || "The ProofReceipt could not be contributed.");
    setState((current) => ({ ...current, receiptContributed: true, networkDelta: payload.data!.networkDelta }));
    go("coverage");
  };

  const renderContent = () => {
    if (initialStep === "product") return <ProductStep go={go} />;
    if (initialStep === "scan") return <ScanStep go={go} setState={setState} state={state} />;
    if (initialStep === "proof-map") return <ProofMapStep go={go} state={state} />;
    if (initialStep === "setup") return <SetupStep openWindow={openWindow} setState={setState} state={state} />;
    if (initialStep === "progress") return <ProgressStep key={state.baselineOrigin ?? "unhydrated"} openReceipt={openReceipt} setState={setState} state={state} />;
    if (initialStep === "receipt") return <ReceiptStep contribute={contribute} state={state} />;
    return <CoverageStep state={state} />;
  };

  return (
    <>
      {showDemoControls ? <div className="page" style={{ paddingBottom: 0 }}><ScenarioBar reset={reset} setState={setState} state={state} /></div> : null}
      {renderContent()}
    </>
  );
}
