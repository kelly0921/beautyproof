import Link from "next/link";
import { getRequestRepository } from "@/lib/data/repository-provider";
import { product } from "@/lib/product";

export const dynamic = "force-dynamic";

export default async function AppProofsPage() {
  const repository = await getRequestRepository();
  const receipts = await repository.listReceipts();
  return <div className="app-screen app-proofs-screen"><header className="app-page-heading"><p className="app-kicker">Proof library</p><h1>Your skincare evidence.</h1><p>Every receipt keeps the exact formula, claim, starting condition, and limitations attached.</p></header>{receipts.length ? <div className="app-proof-grid">{receipts.map((receipt) => { const delta = receipt.followup.hd_moisture - receipt.baseline.hd_moisture; return <Link className="app-proof-card" href={`/app/proofs/${receipt.id}`} key={receipt.id}><div className="app-proof-card-head"><div className={`app-verdict app-verdict-${receipt.verdict}`}>{receipt.verdict}</div><span>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(receipt.createdAt))}</span></div><p>{product.brandName}</p><h2>{product.name}</h2><small>Visible hydration in 14 days · 2026 US Formula</small><div className="app-proof-delta"><span>Moisture change</span><strong>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}</strong></div><footer><span>{receipt.evidenceQuality} evidence</span><span>{receipt.consentToAggregate ? "Contributed" : "Private"}</span><b>›</b></footer></Link>; })}</div> : <section className="app-proof-empty"><span>◎</span><h2>No ProofReceipts yet</h2><p>Complete a baseline, check-in, and follow-up to create your first standardized receipt.</p><Link className="app-primary-action" href="/app/scan">Start a baseline →</Link></section>}</div>;
}
