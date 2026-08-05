import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptConsentButton } from "@/components/app/receipt-consent-button";
import { getRepository } from "@/lib/data/repository-provider";
import { product } from "@/lib/product";

export const dynamic = "force-dynamic";

const metricNames = { hd_moisture: "Moisture", hd_redness: "Redness", hd_texture: "Texture", hd_oiliness: "Oiliness" };

export default async function AppProofDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getRepository();
  const receipt = await repository.getReceipt(id);
  if (!receipt) notFound();
  const [baseline, followup] = await Promise.all([repository.getAnalysis(receipt.baselineAnalysisId), repository.getAnalysis(receipt.followupAnalysisId)]);
  return <div className="app-screen app-proof-detail"><Link className="app-back-link" href="/app/proofs">← Proof library</Link><section className="app-receipt-card"><header><div><span className="app-receipt-wordmark">BeautyProof</span><small>ProofReceipt · {receipt.id.slice(0, 8).toUpperCase()}</small></div><div className={`app-verdict app-verdict-${receipt.verdict}`}>{receipt.verdict}</div></header><p className="app-kicker">Personal cosmetic observation</p><h1>{product.name}</h1><p className="app-receipt-formula">2026 US Formula · exact formula match</p><div className="app-receipt-claim"><span>Claim observed</span><strong>Visible hydration in 14 days</strong></div><div className="app-receipt-metrics">{(Object.keys(metricNames) as (keyof typeof metricNames)[]).map((metric) => { const delta = receipt.followup[metric] - receipt.baseline[metric]; return <div key={metric}><span>{metricNames[metric]}</span><small>{receipt.baseline[metric].toFixed(1)} start</small><small>{receipt.followup[metric].toFixed(1)} follow-up</small><strong className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}</strong></div>; })}</div><div className="app-receipt-facts"><div><span>Evidence</span><strong>{receipt.evidenceQuality}</strong></div><div><span>Adherence</span><strong>{Math.round(receipt.adherenceRate * 100)}%</strong></div><div><span>Experience</span><strong>{receipt.experience}</strong></div></div><section className="app-receipt-verdict"><p className="app-kicker">What this supports</p><h2>{receipt.verdictExplanation}</h2><p>{receipt.sensoryNote}</p></section><div className="app-provenance"><div><span>Baseline analysis</span><strong>{baseline?.providerTaskId ?? receipt.baselineAnalysisId}</strong><small>{baseline?.origin === "live_youcam" ? "Live YouCam Skin AI v2.1" : "Cached-real YouCam result"}</small></div><div><span>Follow-up analysis</span><strong>{followup?.providerTaskId ?? receipt.followupAnalysisId}</strong><small>{followup?.origin === "live_youcam" ? "Live YouCam Skin AI v2.1" : "Cached-real YouCam result"}</small></div></div><footer><span>Not medical diagnosis or causal proof.</span><span>Created {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(receipt.createdAt))}</span></footer></section><ReceiptConsentButton initiallyConsented={receipt.consentToAggregate} receiptId={receipt.id} /></div>;
}
