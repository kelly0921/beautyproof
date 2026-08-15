import Link from "next/link";

export default function DataSourcesPage() {
  return <div className="app-screen app-data-sources-screen">
    <Link className="app-back-link" href="/app/profile">← Profile</Link>
    <header className="app-page-heading"><p className="app-kicker">Trust and provenance</p><h1>Where the information comes from.</h1><p>BeautyProof keeps product context, skin measurements, personal evidence, and demonstration data separate so each result can be understood honestly.</p></header>
    <div className="app-source-grid">
      <section><span className="app-source-number">01</span><div><p className="app-kicker">Product and formula</p><h2>Curated fictional catalog</h2><p>Aster Vale, DewSignal, its $118 price, claims, formula history, review count, and creator recommendation are original demonstration data. BeautyProof does not currently pull from a retailer catalog or universal ingredient database.</p></div></section>
      <section><span className="app-source-number">02</span><div><p className="app-kicker">Skin measurements</p><h2>YouCam Skin Analysis v2.1</h2><p>Live photos are processed server-side by YouCam. BeautyProof uses returned <code>raw_score</code> values for comparison and eligibility, displays provider provenance, and does not retain the face image after numeric results return.</p></div></section>
      <section><span className="app-source-number">03</span><div><p className="app-kicker">ProofMap background</p><h2>Disclosed synthetic records</h2><p>The background cohort is a deterministic set of synthetic ProofReceipts used to demonstrate future network scale. Synthetic, simulated, cached-real, and live records remain visibly separated and never change origin.</p></div></section>
      <section><span className="app-source-number">04</span><div><p className="app-kicker">Your evidence</p><h2>Session-scoped ProofWindows</h2><p>Your analyses, check-ins, trials, and receipts are stored in a private signed browser session. A receipt enters the wider shopper ProofMap only after a separate explicit consent action.</p></div></section>
      <section><span className="app-source-number">05</span><div><p className="app-kicker">Campaign and reward</p><h2>Prototype business model</h2><p>Aster Vale’s sponsored Proof Campaign and $15 store credit are fictional prototype records. Rewards depend on completing the protocol—not on a positive result—and no money or store credit is actually issued.</p></div></section>
    </div>
    <section className="app-source-boundary"><strong>What BeautyProof can say</strong><p>These are cosmetic observations during a personal product trial. They can support a personal keep, swap, continue, pause, return, or inconclusive decision. They do not establish product causality, medical diagnosis, clinical proof, or scientific efficacy.</p></section>
  </div>;
}
