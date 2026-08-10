"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CampaignActivationButton({ campaignId, status, redirectToOpportunity = false }: { campaignId: string; status: string; redirectToOpportunity?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function activate() {
    setState("saving");
    try {
      const response = await fetch(`/api/proof-campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const payload = await response.json() as { ok: boolean; error?: { message: string } };
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "The campaign could not be activated.");
      if (redirectToOpportunity) router.push(`/app/campaigns/${campaignId}?demo=1&scenario=keep`);
      else router.refresh();
    } catch {
      setState("error");
    }
  }

  if (status === "active") return <span className="campaign-live-pill"><i />Campaign active</span>;
  return <div className="campaign-activation-control"><button className="primary-button" disabled={state === "saving"} onClick={activate} type="button">{state === "saving" ? "Activating campaign…" : "Activate funded Proof Campaign"}</button>{state === "error" ? <small role="alert">Campaign activation failed. Please try again.</small> : null}</div>;
}
