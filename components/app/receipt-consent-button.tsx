"use client";

import { useState } from "react";

export function ReceiptConsentButton({ receiptId, initiallyConsented }: { receiptId: string; initiallyConsented: boolean }) {
  const [consented, setConsented] = useState(initiallyConsented);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function contribute() {
    setStatus("saving");
    try {
      const response = await fetch(`/api/proof-receipts/${receiptId}/consent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }) });
      const payload = await response.json() as { ok: boolean };
      if (!response.ok || !payload.ok) throw new Error();
      setConsented(true); setStatus("idle");
    } catch { setStatus("error"); }
  }

  return <div className="app-consent-card"><div><p className="app-kicker">Your choice</p><h2>Help the next shopper who starts here.</h2><p>Contribute the formula, claim, numeric observations, quality, and verdict. Your face image is never contributed.</p></div><button className="app-primary-action" disabled={consented || status === "saving"} onClick={contribute} type="button">{consented ? "Receipt contributed ✓" : status === "saving" ? "Contributing…" : "I consent — add my proof"}</button>{status === "error" ? <small>Consent could not be saved. Please try again.</small> : null}</div>;
}
