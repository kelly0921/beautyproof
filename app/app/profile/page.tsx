import Link from "next/link";
import { getRequestRepository, persistenceConfiguration } from "@/lib/data/repository-provider";

export const dynamic = "force-dynamic";

export default async function AppProfilePage() {
  const repository = await getRequestRepository();
  const [coverage, receipts] = await Promise.all([repository.coverage(), repository.listReceipts()]);
  const persistence = persistenceConfiguration();
  return <div className="app-screen app-profile-screen">
    <header className="app-profile-hero"><span className="app-profile-avatar">BP</span><div><p className="app-kicker">Your private space</p><h1>This browser session</h1><p>Personal cosmetic observation · explicit consent per action</p></div></header>
    <section className="app-profile-section"><h2>Your data</h2><div className="app-settings-list">
      <div><span className="app-setting-icon">◫</span><div><strong>Proof history</strong><small>{coverage.storedWindows} windows · {coverage.storedReceipts} receipts in this browser</small></div><Link href="/app/proofs">View ›</Link></div>
      <div><span className="app-setting-icon">◇</span><div><strong>Network contributions</strong><small>{receipts.filter((receipt) => receipt.consentToAggregate).length} explicitly contributed</small></div><span>Per receipt</span></div>
      <div><span className="app-setting-icon">⌁</span><div><strong>Image retention</strong><small>Face images are not stored in BeautyProof</small></div><span>Protected</span></div>
    </div></section>
    <section className="app-profile-section"><h2>Connections</h2><div className="app-connection-grid">
      <div><span className="app-connection-logo youcam">Y</span><div><strong>YouCam Skin AI</strong><small>Server-side v2.1 analysis</small></div><span className={process.env.YOUCAM_API_KEY ? "connected" : "not-connected"}>{process.env.YOUCAM_API_KEY ? "Connected" : "Setup needed"}</span></div>
      <div><span className="app-connection-logo supabase">S</span><div><strong>Supabase</strong><small>Durable encrypted-at-rest records</small></div><span className={persistence.mode === "supabase" ? "connected" : "not-connected"}>{persistence.mode === "supabase" ? "Connected" : "Demo mode"}</span></div>
    </div></section>
    <section className="app-profile-section"><h2>Privacy boundary</h2><p className="app-session-note">This prototype keeps your personal scans, trials, and receipts scoped to this browser using a secure, HttpOnly session. Clearing site data starts a new private space.</p></section>
    <section className="app-profile-section"><h2>Data transparency</h2><div className="app-settings-list"><Link href="/app/data-sources"><span className="app-setting-icon">i</span><div><strong>Where the information comes from</strong><small>Product data, YouCam measurements, synthetic cohorts, and campaign records</small></div><span>Open ›</span></Link></div></section>
    <section className="app-profile-section"><h2>About BeautyProof</h2><div className="app-settings-list"><Link href="/demo"><span className="app-setting-icon">▶</span><div><strong>Judge demo</strong><small>See the guided three-minute story</small></div><span>Open ›</span></Link><Link href="/proof-coverage"><span className="app-setting-icon">⌁</span><div><strong>Proof Coverage</strong><small>Inspect aggregate evidence boundaries</small></div><span>Open ›</span></Link></div></section>
    <p className="app-legal-note">BeautyProof supports cosmetic observation and purchase decisions. It does not diagnose conditions, recommend treatment, or establish product causality.</p>
  </div>;
}
