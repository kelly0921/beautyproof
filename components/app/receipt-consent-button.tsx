"use client";

import Link from "next/link";
import { useState } from "react";
import type { DataOrigin } from "@/lib/domain";

export function ReceiptConsentButton({ receiptId, receiptOrigin, initiallyConsented, campaignId, demoMode = false }: { receiptId: string; receiptOrigin: DataOrigin; initiallyConsented: boolean; campaignId?: string; demoMode?: boolean }) {
  const [consented, setConsented] = useState(initiallyConsented);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function contribute() {
    setStatus("saving");
    try {
      const response = await fetch(`/api/proof-receipts/${receiptId}/consent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }) });
      const payload = await response.json() as { ok: boolean };
      if (!response.ok || !payload.ok) throw new Error();
      setConsented(true);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const simulated = receiptOrigin === "synthetic";
  return <div className="app-consent-card"><div><p className="app-kicker">Separate public-network choice</p><h2>{simulated ? "Demonstrate the consent boundary." : "Help the next shopper who starts here."}</h2><p>{simulated ? "This receipt uses simulated demo measurements. Contributing it demonstrates the separate consent flow, but it remains labeled synthetic and never counts as real shopper evidence." : "Campaign completion already updates campaign-level Proof Coverage. This separate action contributes the formula, claim, numeric observations, quality, and verdict to the broader shopper ProofMap. Your face image is never contributed."}</p></div>{consented && campaignId ? <Link className="app-primary-action" href={`/brand/campaigns/${campaignId}?updated=1${demoMode ? "&demo=1" : ""}`}>See updated campaign coverage →</Link> : <button className="app-primary-action" disabled={consented || status === "saving"} onClick={contribute} type="button">{consented ? "Receipt contributed ✓" : status === "saving" ? "Contributing…" : simulated ? "I understand — add demo receipt" : "I consent — add my proof"}</button>}{status === "error" ? <small>Consent could not be saved. Please try again.</small> : null}</div>;
}
