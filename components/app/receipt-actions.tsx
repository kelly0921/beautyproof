"use client";

import { useState } from "react";

export interface ReceiptShareData {
  receiptId: string;
  productName: string;
  brandName: string;
  formulaLabel: string;
  claim: string;
  verdict: string;
  evidenceLabel: string;
  evidenceScore: number;
  adherenceLabel: string;
  trialDateLabel: string;
  returnLabel: string;
  experience: string;
  sensoryNote: string;
  confounderSummary: string;
  verdictExplanation: string;
  limitation: string;
  originLabel: string;
  evidenceReasons: string[];
  metrics: { label: string; start: number; followup: number; delta: number }[];
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function wrap(value: string, maxLength: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(value: string, x: number, y: number, options: { maxLength?: number; lineHeight?: number; className?: string } = {}) {
  const { maxLength = 68, lineHeight = 34, className = "body" } = options;
  return wrap(value, maxLength).map((line, index) => `<text class="${className}" x="${x}" y="${y + index * lineHeight}">${escapeXml(line)}</text>`).join("");
}

function receiptSvg(data: ReceiptShareData) {
  const metricRows = data.metrics.map((metric, index) => {
    const y = 570 + index * 62;
    const delta = `${metric.delta >= 0 ? "+" : ""}${metric.delta.toFixed(1)}`;
    return `<text class="metric-label" x="90" y="${y}">${escapeXml(metric.label)}</text>
      <text class="metric" x="465" y="${y}">${metric.start.toFixed(1)} start</text>
      <text class="metric" x="720" y="${y}">${metric.followup.toFixed(1)} follow-up</text>
      <text class="metric delta" x="1050" y="${y}" text-anchor="end">${delta}</text>
      <line x1="90" x2="1110" y1="${y + 22}" y2="${y + 22}" class="hairline" />`;
  }).join("");
  const reasons = data.evidenceReasons.slice(0, 5).map((reason, index) => `<text class="small" x="92" y="${1080 + index * 34}">✓ ${escapeXml(reason)}</text>`).join("");
  const verdictLines = textLines(data.verdictExplanation, 90, 1325, { maxLength: 76, lineHeight: 36, className: "body" });
  const provenanceLines = textLines(`Measurements: ${data.originLabel}. ${data.confounderSummary}`, 90, 1480, { maxLength: 88, lineHeight: 30, className: "small" });
  const limitationLines = textLines(data.limitation, 90, 1600, { maxLength: 94, lineHeight: 28, className: "fine" });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1720" viewBox="0 0 1200 1720">
    <rect width="1200" height="1720" fill="#f3f4ef" />
    <rect x="52" y="44" width="1096" height="1612" rx="8" fill="#fffefa" stroke="#bac0ba" stroke-width="2" />
    <rect x="68" y="60" width="1096" height="1612" rx="8" fill="#dcebe5" opacity=".75" />
    <rect x="52" y="44" width="1096" height="1612" rx="8" fill="#fffefa" stroke="#bac0ba" stroke-width="2" />
    <style>
      .wordmark{font:900 31px Arial,sans-serif;fill:#18201d}.id{font:16px Arial,sans-serif;fill:#6e7772}.kicker{font:800 15px Arial,sans-serif;letter-spacing:3px;fill:#6e2d50}.title{font:500 68px Georgia,serif;fill:#18201d}.formula{font:800 18px Arial,sans-serif;fill:#86506a}.claim{font:500 31px Georgia,serif;fill:#18201d}.metric-label{font:800 18px Arial,sans-serif;fill:#18201d}.metric{font:17px Arial,sans-serif;fill:#6e7772}.delta{font-weight:800;fill:#1f5a4e}.fact-label{font:800 14px Arial,sans-serif;letter-spacing:2px;fill:#6e7772}.fact{font:500 28px Georgia,serif;fill:#18201d}.body{font:25px Georgia,serif;fill:#18201d}.small{font:18px Arial,sans-serif;fill:#42504b}.fine{font:16px Arial,sans-serif;fill:#6e7772}.hairline{stroke:#cbc9c3;stroke-width:1}.rule{stroke:#18201d;stroke-width:7}
    </style>
    <text class="wordmark" x="90" y="112">BeautyProof</text>
    <text class="id" x="90" y="140">ProofReceipt · ${escapeXml(data.receiptId.slice(0, 8).toUpperCase())}</text>
    <rect x="958" y="83" width="150" height="52" rx="18" fill="#dcebe5" />
    <text class="kicker" x="1033" y="116" text-anchor="middle">${escapeXml(data.verdict.toUpperCase())}</text>
    <line x1="90" x2="1110" y1="175" y2="175" class="rule" />
    <text class="kicker" x="90" y="225">PERSONAL COSMETIC OBSERVATION</text>
    ${textLines(data.productName, 90, 305, { maxLength: 29, lineHeight: 70, className: "title" })}
    <text class="formula" x="90" y="410">${escapeXml(`${data.brandName} · ${data.formulaLabel}`)}</text>
    <line x1="90" x2="1110" y1="445" y2="445" class="hairline" />
    <text class="fact-label" x="90" y="486">CLAIM OBSERVED</text>
    <text class="claim" x="90" y="526">${escapeXml(data.claim)}</text>
    <line x1="90" x2="1110" y1="548" y2="548" class="rule" />
    ${metricRows}
    <line x1="90" x2="1110" y1="823" y2="823" class="rule" />
    <text class="fact-label" x="90" y="865">EVIDENCE</text><text class="fact" x="90" y="905">${escapeXml(data.evidenceLabel)} · ${data.evidenceScore}/100</text>
    <text class="fact-label" x="455" y="865">ADHERENCE</text><text class="fact" x="455" y="905">${escapeXml(data.adherenceLabel)}</text>
    <text class="fact-label" x="760" y="865">EXPERIENCE</text><text class="fact" x="760" y="905">${escapeXml(data.experience)}</text>
    <line x1="90" x2="1110" y1="938" y2="938" class="hairline" />
    <text class="fact-label" x="90" y="976">TRIAL DATES</text><text class="small" x="90" y="1008">${escapeXml(data.trialDateLabel)}</text>
    <text class="fact-label" x="760" y="976">RETURN WINDOW</text><text class="small" x="760" y="1008">${escapeXml(data.returnLabel)}</text>
    <text class="fact-label" x="90" y="1050">EVIDENCE QUALITY REASONS</text>
    ${reasons}
    <line x1="90" x2="1110" y1="1265" y2="1265" class="rule" />
    <text class="fact-label" x="90" y="1300">WHY ${escapeXml(data.verdict.toUpperCase())}</text>
    ${verdictLines}
    <text class="fact-label" x="90" y="1445">PROVENANCE AND TRIAL CONTEXT</text>
    ${provenanceLines}
    <text class="fact-label" x="90" y="1570">LIMITATION</text>
    ${limitationLines}
    <text class="fine" x="90" y="1630">${escapeXml(data.sensoryNote)}</text>
  </svg>`;
}

async function createReceiptPng(data: ReceiptShareData) {
  const svg = receiptSvg(data);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The receipt image could not be rendered."));
      image.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1720;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image export is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The receipt image could not be created.")), "image/png"));
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function ReceiptActions({ data }: { data: ReceiptShareData }) {
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const filename = `BeautyProof-${data.receiptId.slice(0, 8)}.png`;

  async function shareReceipt() {
    setStatus("working");
    setMessage("Preparing your ProofReceipt…");
    try {
      const blob = await createReceiptPng(data);
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "My BeautyProof ProofReceipt", text: `${data.productName}: ${data.verdict} · ${data.evidenceLabel}`, files: [file] });
        setStatus("success");
        setMessage("ProofReceipt shared.");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "My BeautyProof ProofReceipt", text: `${data.productName}: ${data.verdict} · ${data.evidenceLabel}`, url: window.location.href });
        setStatus("success");
        setMessage("ProofReceipt link shared.");
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setStatus("success");
      setMessage("Private receipt link copied. It opens only in this browser session.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        setMessage("");
        return;
      }
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The ProofReceipt could not be shared.");
    }
  }

  async function downloadReceipt() {
    setStatus("working");
    setMessage("Creating a high-resolution receipt image…");
    try {
      const blob = await createReceiptPng(data);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("success");
      setMessage("ProofReceipt image downloaded.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The ProofReceipt image could not be downloaded.");
    }
  }

  return <section className="app-receipt-actions" aria-label="ProofReceipt actions">
    <div><p className="app-kicker">Keep your evidence</p><h2>Share or save this ProofReceipt.</h2><p>The exported image contains numeric observations and provenance—not a face image.</p></div>
    <div className="app-receipt-action-buttons">
      <button className="app-primary-action" disabled={status === "working"} onClick={shareReceipt} type="button">Share ProofReceipt</button>
      <button className="app-secondary-action" disabled={status === "working"} onClick={downloadReceipt} type="button">Download image</button>
    </div>
    {message ? <small aria-live="polite" className={status === "error" ? "error" : ""}>{message}</small> : null}
  </section>;
}
