# BeautyProof — Devpost submission package

Re-check the live Devpost page immediately before submission because requirements and deadlines can change.

## Positioning

**Topic:** Skin AI

**Title:** BeautyProof

**Consumer tagline:** Skincare reviews from people whose skin started like yours.

**Business tagline:** Brands pay for proof, not praise.

**One-sentence value:** BeautyProof turns customer acquisition from buying attention into funding outcome-neutral, formula- and claim-specific evidence anchored to YouCam Skin AI raw-score baselines.

**Closing line:** Brands currently pay for impressions. BeautyProof lets them invest in proof.

## Submission checklist

- [ ] Complete functional repository URL with source, assets, setup, migrations, and tests.
- [ ] Public MIT `LICENSE`, or private-repository access shared with the event contact.
- [ ] Text description covering features, functionality, consumer value, and brand/retail value.
- [ ] Updated screenshots showing the brand campaign, consumer eligibility, sponsored ProofWindow, reward-bearing ProofReceipt, campaign coverage, and mobile app.
- [ ] Public 1–3 minute end-to-end video on YouTube, Vimeo, or Youku.
- [ ] Video explicitly names YouCam Skin Analysis v2.1 and shows the intended device experience.
- [ ] Video is public, password-free, and contains no unlicensed media.
- [ ] Submitter type, residence country, app status, and project start date.
- [ ] Required experience-question answers.
- [ ] Human eligibility and official-rules review.
- [ ] Repository, deployment, and video links verified while signed out.

A public deployment is strongly recommended even if it is not a mandatory deliverable.

## Judging evidence map

| Criterion | What judges should see | BeautyProof evidence |
| --- | --- | --- |
| Technological Implementation | Skilled, non-trivial YouCam integration and a complete working system | Baseline and follow-up uploads call a server-only Skin Analysis v2.1 pipeline: file initialization, presigned upload, four HD actions, task polling, typed errors, retry/timeout, raw/UI score separation, stored task provenance, Supabase persistence, campaign eligibility, idempotent enrollment/reward handling, ProofWindow completion, and consent-controlled aggregation. |
| Design | A coherent product rather than an API demonstration | Premium brand campaign surface, mobile sponsored opportunity, explainable eligibility, calm trial experience, iconic ProofReceipt, outcome-neutral reward state, coverage distributions, origin disclosure, privacy copy, empty/error states, and deterministic presentation controls. |
| Potential Impact | Credible audience, problem, and solution | Brands fund exact evidence gaps instead of generic impressions. Consumers earn for completing useful observations rather than absorbing all fit uncertainty. Future shoppers receive more relevant current-formula evidence only after separate consent. No unvalidated revenue or return-reduction claim is made. |
| Quality of the Idea | Creative use of Skin AI with domain understanding | YouCam is not a one-off skin score. It becomes the measurement layer for claim compilation, formula resets, explainable campaign matching, standardized ProofWindows, reusable ProofReceipts, outcome-neutral rewards, and evidence coverage. Unsupported claims remain explicitly blocked. |

## Hero story

- Aster Vale reformulated DewSignal Adaptive Serum.
- The 2024 evidence remains historical and cannot transfer to the 2026 formula.
- The brand funds a hydration campaign for starting `hd_moisture <= 60`.
- Target: 25 completed current-formula ProofReceipts.
- Reward: $15 Aster Vale store credit, represented only in a prototype ledger.
- Consumer judge baseline: simulated YouCam-format raw score 54.2, producing an explainable eligible result while remaining synthetic in coverage.
- Reward becomes earned after a valid stored receipt for `keep`, `swap`, `return`, `pause`, `continue`, or `inconclusive`.
- Campaign Proof Coverage updates under campaign terms.
- Shopper ProofMap updates only after a separate aggregation-consent action.

## Ready-to-paste project description

BeautyProof is a new skincare evidence system for both consumers and brands.

Today, beauty brands pay for attention while consumers pay to discover whether a product actually fits them. A serum can have thousands of reviews without showing which formula was tested, which claim the reviewer evaluated, where their skin started, or whether the evidence applies to the bottle sold today.

BeautyProof turns that uncertainty into a fundable evidence gap. When fictional skincare brand Aster Vale reformulates DewSignal Adaptive Serum, the product name remains the same but the proof resets. Historical receipts stay inspectable, yet the 2026 formula cannot inherit them. Aster Vale activates a Proof Campaign for one exact claim—visible hydration in 14 days—and one transparent starting range: a YouCam `hd_moisture` raw score of 60 or below.

The consumer explicitly consents to a cosmetic starting analysis. The live path sends a high-resolution image through our server-only YouCam Skin Analysis v2.1 integration, requesting HD moisture, redness, texture, and oiliness. BeautyProof uses returned `raw_score` values for evidence matching and keeps `ui_score` out of the eligibility engine. The deterministic judge path uses a clearly labeled simulated YouCam-format fixture that represents no real person and remains synthetic throughout the system.

Eligibility is explainable. It uses only campaign status, exact formula and claim, analysis validity and provenance, configured raw-score ranges, and trial readiness. It never uses race, age, attractiveness, facial identity, or demographic inference. Synthetic analyses cannot enroll.

An eligible consumer accepts outcome-neutral campaign terms and begins a linked 14-day ProofWindow. At enrollment, BeautyProof creates one pending prototype reward entry. Lightweight check-ins keep adherence, sensory experience, and confounders separate from image observations. A follow-up YouCam analysis completes the window and produces a standardized ProofReceipt with exact formula fingerprint, claim, baseline and follow-up task provenance, raw-score changes, evidence quality, limitations, origin, return timing, and a conservative keep, swap, continue, pause, return, or inconclusive verdict.

The brand is buying completion, not positivity. Every valid verdict earns the same $15 prototype store credit after the receipt is stored. No funds move, and the result never claims the product caused the observed change.

The completed receipt immediately closes part of prototype Campaign Proof Coverage under the disclosed campaign participation terms. A second, separate consumer choice controls whether the numeric receipt joins the broader shopper ProofMap. Simulated judge receipts, synthetic scale records, verified cached records, and live records remain visibly separated. Live API analyses prove the integration, but a receipt completed with the labeled Day 14 shortcut remains synthetic; real completed evidence requires both verified measurements and an actually elapsed protocol.

BeautyProof is not a wrapper around a skin score. YouCam Skin AI is the measurement layer inside a new transaction primitive: brands fund missing evidence, consumers earn for completing honest observations, and formula-specific ProofReceipts become reusable decision infrastructure.

## Functional YouCam proof

For the official recording:

1. Configure `YOUCAM_API_KEY` only as a server/runtime secret.
2. Open `/demo`, confirm **Step 1 · Fund · Brand view**, and activate the campaign.
3. At **Step 2 · Match · Consumer app**, choose **Use live YouCam image instead** and select a prepared image under 10 MB with a short side of at least 1080 px.
4. Pause on the live YouCam provenance and raw-score eligibility reason.
5. Enroll and start the sponsored ProofWindow.
6. At Day 14, upload the prepared follow-up image through the live path.
7. Pause on both stored YouCam task IDs in the ProofReceipt.
8. Show that the analyses are live while the time-jumped receipt remains synthetic, then show reward status `earned`, the outcome-neutral copy, and “prototype credit ledger · no funds moved.”
9. Use separate shopper aggregation consent and show campaign/public coverage state.

The simulated fixture path is the visibly labeled backup and never masquerades as a live request or real user evidence.

## Required custom-question drafts

### Was there a moment during the hackathon where the API surprised you—in a good or frustrating way?

The useful surprise was that Skin Analysis returns both `raw_score` and `ui_score`. That changed the product architecture: raw scores drive before/after comparison and eligibility, while motivational UI scores remain outside the evidence engine. The frustrating surprise was how much HD image quality matters, which led us to design resolution, lighting, framing, permission, task failure, and timeout as explicit states instead of hiding them behind a generic error.

### Are there industries or use cases you think Perfect Corp.'s API could serve that nobody is talking about yet?

Outcome-neutral post-purchase evidence markets are underexplored. Skin AI is usually treated as a diagnosis or recommendation moment before purchase. BeautyProof uses it across the product lifecycle: identifying a formula-specific evidence gap, matching a transparent starting measurement, standardizing a personal observation, supporting a keep/swap/return decision, and—with separate consent—creating reusable evidence for the next shopper.

### Where did you hit a wall technically? How did you work around it?

The main wall was reconciling a real asynchronous API workflow with a reliable sub-three-minute judge experience. Live Skin Analysis requires file initialization, presigned upload, task creation, polling, HD-quality input, and a protected credential. We isolated that workflow in a server-only typed service with retry and timeout behavior, then added a clearly labeled simulated fixture path. The live upload remains fully functional and never silently falls back, while deterministic memory-mode campaign state makes the complete transaction inspectable without claiming that demo measurements came from a real person.

## Video plan

Use [`demo-script.md`](demo-script.md). Target 2:45.

1. Record at 1440×900 or 1920×1080.
2. Show the Formula Reset, Claim Compiler, campaign budget, and activation.
3. Use a prepared live baseline image and pause on the 54.2-style raw-score eligibility explanation.
4. Enroll, start the sponsored window, save one check-in, and use the labeled time jump.
5. Use a prepared live follow-up image.
6. Spend the most time on the ProofReceipt, live analysis task provenance, synthetic time-jumped receipt label, outcome-neutral earned reward, coverage change, and separate consent.
7. End with “Brands pay for proof, not praise.”
8. Keep the final cut under three minutes and verify it while signed out.

## Screenshot pack

Run `npm run screenshots` to generate the current submission-ready images in [`docs/screenshots/devpost`](screenshots/devpost). The script forces memory persistence and simulated YouCam-format fixtures, so it cannot mutate configured Supabase data, spend live API units, or create records labeled as real evidence.

The generated sequence is:

1. `/demo` — Step 1 Brand view, campaign brief, evidence gap, and primary activation action
2. `/app/campaigns/[id]` — Step 2 Consumer app opportunity and YouCam source
3. Eligibility result — Step 3 and 54.2 within the 60-or-below range
4. `/app/trial/[id]` — Step 4 sponsored ProofWindow and pending reward
5. `/app/proofs/[id]` — Step 5 ProofReceipt and earned reward
6. `/brand/campaigns/[id]?updated=1&demo=1` — Step 6 coverage, origins, rewards, and shopper consent count
7. Mobile `/app` — sponsored opportunity card

## External fields still needed

- Public repository URL
- Public Cloudflare deployment URL
- Public demo video URL
- Submitter type and residence country
- Project start date in the required format
- Optional social post URL
- Final screenshots uploaded to Devpost
