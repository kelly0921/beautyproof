# BeautyProof — Devpost submission package

Reviewed against the live YouCam API Skin AI & Apparel VTO Hackathon page on August 4, 2026 ET. Re-check Devpost immediately before submission because official requirements can change. No host announcements were posted when this package was prepared.

## Positioning

**Topic:** Skin AI

**Title:** BeautyProof

**Tagline:** Skincare reviews from people whose skin started like yours—powered by YouCam Skin AI baselines, formula-specific evidence, and consented ProofReceipts.

**One-sentence value:** BeautyProof helps a skincare shopper decide whether a specific formula is worth buying or keeping by replacing context-free stars with comparable personal observations anchored to YouCam Skin AI raw scores.

## Deadline

Submission closes **August 17, 2026 at 11:45 AM Eastern Time**. Do not plan to upload at the deadline; repository access, video visibility, and the submitted links should be tested from a signed-out browser first.

## Required materials checklist

- [ ] A complete, functional code repository URL containing source, assets, setup instructions, and testing instructions.
- [ ] If public, include relevant licensing. This app includes an MIT `LICENSE`. If private, share it with `contact_event@PerfectCorp.com`.
- [ ] A text description explaining features, functionality, and clear consumer or retail value.
- [ ] Project screenshots. Eight full-page captures are in `docs/screenshots/`, including desktop and mobile app views.
- [ ] A public 1–3 minute end-to-end demo video on YouTube, Vimeo, or Youku. YouTube is preferred.
- [ ] The video explains which YouCam API is used and shows the product functioning on its intended device.
- [ ] The video is public, has no password or login, and contains no unlicensed music, trademarks, or copyrighted material.
- [ ] Submitter type, country of residence, app status, and project start date.
- [ ] Answers to the three required experience questions drafted below.
- [ ] Agreement to an exit interview and inclusion in a blog article if selected as a winner.
- [ ] Final eligibility and official-rules review by the human submitter.

A hosted website is not a required Devpost deliverable, but a working public deployment is strongly recommended so judges can experience the product without local setup.

## Judging evidence map

| Criterion | What judges need to see | BeautyProof evidence |
| --- | --- | --- |
| Technological Implementation | A thorough, skilled, non-trivial YouCam integration with consumer or retail value | Both baseline and Day 14 live upload controls invoke `/api/skin-analysis/upload`. The server initializes a v2.1 Skin Analysis file, uploads to the presigned destination, creates an HD JSON task, polls with retry/timeout handling, stores each analysis and its provider task ID, and parses four raw-score metrics separately from UI scores. A durable Supabase-backed ProofWindow, check-in, exact-formula matching, similarity, evidence quality, server-generated verdict, and consent record build on those results. |
| Design | A coherent product, not a technical proof of concept | A dedicated mobile-first app uses persistent Home, Scan, Proofs, and Profile navigation, a next-action dashboard, a focused capture workflow, active-trial progress, saved evidence, and connected-service status. The separate responsive judge journey still explains claim selection, consent, baseline, ProofMap, ProofWindow, ProofReceipt, and Proof Coverage. Empty/scarce evidence, formula changes, privacy, origin, limitations, and inconclusive outcomes are designed states. |
| Potential Impact | A credible problem, audience, and demonstrated solution | Skincare shoppers cannot tell whether a review tested the same claim, formula, or starting condition. BeautyProof makes those variables explicit and gives shoppers a transparent keep/swap/return decision. The consented network and coverage view show retailer and brand value without claiming unvalidated revenue impact. |
| Quality of the Idea | A creative, non-obvious use of Skin AI and genuine domain understanding | YouCam observations are not presented as a one-off skin score. They become the baseline and follow-up evidence layer for claim-aware reviews, formula resets, personal ProofWindows, and standardized ProofReceipts. The Claim Compiler also preserves what facial image analysis cannot responsibly establish. |

## Functional YouCam proof for judges

For the official recording and final deployed build:

1. Configure `YOUCAM_API_KEY` only on the server.
2. Open `/scan`, select **High-resolution upload**, and choose a prepared JPG or PNG under 10 MB with a short side of at least 1080 px.
3. Consent and choose **Analyze image with YouCam**.
4. Pause on the ProofMap origin chip showing that a live result was returned by YouCam Skin AI v2.1.
5. At Day 14, choose **High-resolution follow-up upload** and analyze a prepared follow-up image.
6. Pause on the ProofReceipt provenance ledger showing both stored YouCam task records and the dynamic ProofWindow/receipt IDs.
7. Continue through consent and Proof Coverage.

The preloaded path is a reliable fallback built from sanitized cached-real YouCam output. It is deliberately labeled and never passed off as a live request. Synthetic records are also counted and labeled separately.

## Ready-to-paste project description

BeautyProof is a new skincare review standard: reviews from people whose skin started like yours.

Today, a product can have thousands of stars without telling a shopper which claim was tested, whether the reviewer used the same formula sold today, what their skin looked like at the start, or whether the product fit within the return window. BeautyProof replaces that ambiguity with a formula-specific personal observation journey.

The experience begins with a Claim Compiler. It separates claims that YouCam Skin AI can help observe, such as visible hydration, from subjective claims such as finish and claims that a facial image cannot responsibly establish, such as barrier repair. After explicit consent, the shopper captures a guided baseline. The live path sends a high-resolution image through our server-only YouCam Skin Analysis v2.1 integration and requests HD moisture, redness, texture, and oiliness output. BeautyProof uses the returned raw scores for comparison while keeping motivational UI scores separate.

Those starting observations create a personalized ProofMap. Instead of treating 2,418 generic reviews as equally relevant, BeautyProof selects individual ProofReceipts for the exact formula, selected claim, consent status, evidence quality, and comparable starting conditions. When a formula changes, a Formula Reset preserves historical receipts for inspection but excludes them from the current evidence pool by default.

The shopper can then begin a 14-day ProofWindow aligned to the selected hydration claim and product return deadline. Lightweight check-ins keep measured observations, use adherence, sensory experience, and confounders separate. At follow-up, BeautyProof produces a ProofReceipt containing the exact formula fingerprint, claim, baseline and follow-up raw scores, evidence-quality reasons, limitations, time remaining to return, data origin, and a conservative keep, swap, continue, pause, return, or inconclusive verdict.

With a second explicit consent action, only the numeric receipt and minimal context—not the face image—can update the shared evidence network. The Proof Coverage view gives retailers and brands a compact picture of where formula-specific evidence is strong, where it is missing, and which records are cached-real versus synthetic. This creates consumer value at the decision moment and a credible path to better post-purchase guidance without presenting personal observations as diagnosis, clinical proof, or causality.

BeautyProof is not a wrapper around a skin score. YouCam Skin AI is the measurement layer inside a broader decision system that compiles product claims, respects formula changes, standardizes personal trials, and turns each consented result into more useful evidence for the next shopper.

## Required custom-question drafts

### Was there a moment during the hackathon where the API surprised you—in a good or frustrating way?

The useful surprise was that the Skin Analysis result exposes both `raw_score` and `ui_score`. That distinction changed the product design. We use raw scores for before/after comparison and evidence matching, while keeping presentation-oriented scores out of the evidence engine. The frustrating surprise was how much image quality matters for HD actions; that led us to make resolution, lighting, framing, permission, task failure, and timeout explicit product states instead of hiding them behind a generic error.

### Are there industries or use cases you think Perfect Corp.'s API could serve that nobody is talking about yet?

Post-purchase evidence infrastructure is underexplored. Skin AI is usually positioned as a diagnostic or recommendation moment before purchase. BeautyProof uses it across the product lifecycle: translating a marketing claim into an observation plan, preserving formula lineage, helping a shopper make a keep/swap/return decision, and—with consent—creating standardized evidence that can improve the next shopper's decision and show retailers where evidence coverage is weak.

### Where did you hit a wall technically? How did you work around it?

The main wall was reconciling a real asynchronous API workflow with a reliable three-minute judging experience. Live Skin Analysis requires file initialization, a presigned upload, task creation, polling, HD-quality input, and a protected credential; any one can introduce demo latency or failure. We isolated that workflow in a server-only service with typed errors, retry and timeout behavior, then added a clearly labeled sanitized cached-real path for repeatable judging. The live upload remains fully functional and never silently falls back, while the deterministic path lets judges inspect the entire product even if a camera, credential, or network is unavailable.

## Video plan — 2:45 target

Use `docs/demo-script.md` as the spoken script. For the Devpost recording:

1. Record on the intended desktop browser at a legible 1440×900 or 1920×1080 viewport.
2. Use prepared images for both live high-resolution upload paths and pause briefly on the live origin chip and receipt provenance ledger.
3. Show the complete journey, not a code walkthrough.
4. Explicitly name “YouCam Skin Analysis v2.1” and the four requested HD actions.
5. Spend the most time on the ProofMap, Formula Reset, and ProofReceipt—the non-obvious value built on top of the API.
6. End on the consent-controlled Proof Coverage update and consumer/retail value.
7. Keep the final cut below three minutes and verify it while signed out.

## Screenshot inventory

- `docs/screenshots/01-product-claim-compiler.png` — problem, product, and Claim Compiler.
- `docs/screenshots/02-proof-map-formula-reset.png` — personalized evidence and formula lineage.
- `docs/screenshots/03-proof-receipt.png` — primary submission hero image.
- `docs/screenshots/04-proof-coverage.png` — consented network and retailer view.
- `docs/screenshots/05-youcam-live-upload.png` — explicit live YouCam upload control, HD constraints, and consent boundary.
- `docs/screenshots/06-app-dashboard.png` — desktop repeat-user dashboard and proof history.
- `docs/screenshots/07-app-dashboard-mobile.png` — mobile app shell with persistent bottom navigation.
- `docs/screenshots/08-app-scan-mobile.png` — focused mobile baseline capture and consent flow.

## External fields still needed

- Repository URL.
- Public deployment URL, if used.
- Public demo video URL.
- Submitter type and country of residence.
- Project start date in `MM-DD-YY` format.
- Optional social post URL.
- Final screenshots uploaded to Devpost.
