# BeautyProof

BeautyProof turns skincare marketing claims into formula-specific personal observation plans and replaces vague star ratings with standardized ProofReceipts from shoppers whose skin started with comparable measurable conditions.

The Proof Campaign upgrade changes who pays for product uncertainty: a brand funds a specific evidence gap for an exact formula, claim, and starting-measurement range, while an eligible consumer earns an outcome-neutral prototype reward for completing the protocol.

**Consumer promise:** Skincare reviews from people whose skin started like yours.

**Business model:** Brands pay for proof, not praise.

**Product boundary:** BeautyProof supports cosmetic observation and personal decisions. It does not diagnose medical conditions, establish causality, run clinical trials, or verify scientific efficacy.

## What the prototype demonstrates

The deterministic hero story follows the fictional Aster Vale DewSignal Adaptive Serum through:

1. A Formula Reset showing why the 2026 formula cannot inherit historical evidence.
2. A Claim Compiler that allows hydration observation, keeps finish subjective, and blocks a facial-image barrier-repair campaign.
3. An outcome-neutral Proof Campaign targeting 25 hydration receipts from starting `hd_moisture` raw scores at 60 or below, with a $15 Aster Vale store-credit reward.
4. A live YouCam Skin Analysis v2.1 baseline or explicitly simulated judge fixture, followed by an explainable eligibility decision with no demographic or identity inference.
5. Campaign enrollment, a pending prototype reward ledger, and a linked 14-day ProofWindow.
6. An under-ten-second check-in, labeled demo time jump, and second live measurement or simulated judge fixture.
7. A persisted ProofReceipt containing exact formula and claim, authoritative analysis provenance, raw-score changes, sensory feedback, confounders, evidence quality, limitations, origin, and a conservative verdict.
8. Reward earning after receipt persistence for every valid verdict, independent of public aggregation consent.
9. Campaign Proof Coverage increasing under disclosed campaign terms, followed by a separate consumer choice to update the shopper ProofMap.

The reliable judge path has no external-service dependency. The official recording should use prepared high-resolution images through the live YouCam upload controls.

## Product surfaces

- **`/app` — shopper app:** Mobile-first Home, Scan, Proofs, and Profile navigation plus a prominent sponsored opportunity.
- **`/app/campaigns/[id]` — sponsored opportunity:** Exact formula and claim, reward terms, cosmetic-analysis consent, explainable eligibility, enrollment, and sponsored ProofWindow creation.
- **`/app/trial/[id]` — active trial:** Stored progress, sponsored provenance, reward state, check-in, labeled time jump, and live or simulated follow-up.
- **`/app/proofs/[id]` — ProofReceipt:** Formula, claim, measurements, verdict, evidence quality, provenance, outcome-neutral reward, and separate shopper aggregation consent.
- **`/app/data-sources` — trust and provenance:** Plain-language disclosure of curated product data, live YouCam measurements, synthetic network records, private session evidence, and prototype campaign/reward data.
- **`/brand/campaigns/[id]` — brand campaign:** Formula-reset context, Claim Compiler boundaries, activation, prototype budget, campaign coverage, verdict distribution, evidence quality, origin disclosure, rewards, and shopper ProofMap contribution.
- **`/demo` — guided judge journey:** A focused six-step path with persistent progress and explicit Brand/Consumer role changes, from funded evidence gap through campaign coverage.
- **Original evidence surfaces:** `/products/dewsignal`, `/proof-map`, `/proof-window/*`, `/proof-receipt/*`, and `/proof-coverage` remain available.

## Hero Proof Campaign

- Brand: Aster Vale
- Product: DewSignal Adaptive Serum
- Formula: 2026 US Formula
- Claim: Visible hydration in 14 days
- Primary raw metric: `hd_moisture`
- Starting range: 60 or below
- Target: 25 completed ProofReceipts
- Reward: $15 Aster Vale store credit
- Total prototype budget: $375
- Outcome-neutral: always true
- Ledger disclosure: prototype credit; no funds moved

The simulated judge baseline is 54.2 and deterministically exercises the eligibility flow. It is stored as synthetic and never counted as real user evidence.

## Architecture

- **Application:** Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS, and a local accessible component layer.
- **Server APIs:** Next route handlers with Zod validation, response envelopes, and typed error codes.
- **YouCam boundary:** `lib/youcam/service.ts` owns file initialization, presigned upload, task creation, polling, retry, and result parsing. `YOUCAM_API_KEY` is server-only.
- **Campaign engines:** Claim launch guard, explainable eligibility, outcome-neutral reward rules, deterministic coverage aggregation, and idempotent completion.
- **Evidence engines:** Claim configuration, normalized weighted distance, five-dimension quality scoring, conservative verdicts, and exact-formula aggregates.
- **Persistence:** One async contract selects Supabase when the URL and server secret are configured, otherwise active-process memory. Both adapters implement the same campaign, enrollment, reward, analysis, ProofWindow, check-in, receipt, and consent behavior.
- **Cloudflare:** Full-stack Next.js deployment through OpenNext on Cloudflare Workers.
- **Tests:** Vitest unit/integration coverage and Playwright critical-path coverage.

## Ethical and privacy boundaries

- Cosmetic observation and consumer decision support only.
- No diagnosis, clinical-trial language, causal claim, or efficacy verification.
- YouCam `raw_score` drives comparison and eligibility; `ui_score` does not.
- A baseline is a starting measurement, not a long-term personal normal.
- No race, ethnicity, age, attractiveness, identity, or demographic inference.
- Verified live or cached YouCam analyses may qualify. The designated simulated fixture may exercise the judge campaign but remains synthetic in receipts and coverage; arbitrary synthetic analyses cannot enroll.
- Reward depends only on valid protocol completion, never verdict or public aggregation consent.
- Campaign participation and shopper ProofMap consent are separate.
- Images are not stored after numeric output is returned.
- Live, verified cached, and simulated/synthetic origins remain explicitly disclosed.
- A live API analysis proves the integration, but a receipt created with the labeled Day 14 time jump remains synthetic. Real completed evidence requires the actual protocol duration to elapse.
- No real reward, store credit, or money is issued.

## Local setup

```powershell
git clone https://github.com/kelly0921/beautyproof.git
cd beautyproof
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3026/demo](http://localhost:3026/demo).

The app works without external credentials through memory persistence and clearly labeled simulated YouCam-format fixtures.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `YOUCAM_API_KEY` | Live path only | Server-side bearer credential for YouCam Skin Analysis v2.1. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical application URL. |
| `SUPABASE_URL` | Durable persistence | Supabase project URL used by the server repository. |
| `SUPABASE_SECRET_KEY` | Durable persistence | Preferred `sb_secret_...` server key. Never expose with `NEXT_PUBLIC_`. |
| `BEAUTYPROOF_SESSION_SECRET` | Recommended in production | Random server-only value used to sign the HttpOnly browser session that scopes personal evidence. |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy fallback | Accepted only when the newer server secret is unavailable. |
| `DATABASE_URL` | Migration tooling | PostgreSQL connection string. |
| `DEMO_MODE` | No | Enables labeled server demo behavior. |
| `NEXT_PUBLIC_DEMO_MODE` | No | Exposes presentation controls. |
| `DEMO_SEED` | No | Defaults to `20260804`. |

No new secret is required for Proof Campaigns. Campaign configuration and the reward ledger are database records.

Personal scans, ProofWindows, enrollments, rewards, and ProofReceipts are scoped to a signed HttpOnly browser session. The Worker uses `BEAUTYPROOF_SESSION_SECRET` when configured and falls back to the Supabase server secret for backward-compatible local setup. Clearing site data starts a new private space; only receipts explicitly consented for aggregation enter public ProofMap queries.

Each completed ProofReceipt now includes trial dates, completed uses, return-window timing, routine/confounder context, evidence-quality reasons, measurement provenance, and limitations. It can be shared through the device share sheet or exported as a high-resolution PNG containing no face image.

## YouCam live setup

1. Set `YOUCAM_API_KEY` in `.env.local` or as an encrypted Worker runtime secret.
2. Use a JPG or PNG under 10 MB with a short side of at least 1080 px, a front-facing visible face, and even lighting.
3. The live controls POST multipart input to `/api/skin-analysis/upload` with `allowCachedFallback=false`.
4. The server initializes `/s2s/v2.1/file/skin-analysis`, uploads to the presigned destination, creates the four-action JSON task, polls, parses raw and UI scores separately, and stores numeric provenance.

Live controls never silently fall back. The preloaded route is visibly labeled simulated data and produces synthetic-origin records.

## Supabase migrations

Apply in order:

1. `supabase/migrations/0001_beautyproof.sql`
2. `supabase/migrations/0002_proof_campaigns.sql`
3. `supabase/migrations/0003_provenance_hardening.sql`

`0002` adds `brand`, `proof_campaign`, `campaign_enrollment`, `reward_ledger`, and nullable `proof_window.campaign_enrollment_id`, then idempotently seeds Aster Vale and the hero campaign. RLS is enabled with no browser policies; only the elevated server role has table privileges.

`0003` narrowly relabels demo fixtures persisted by earlier builds as synthetic, then relabels receipts linked to those fixtures. It does not change genuine live-upload analyses.

After migration:

```powershell
npm run check:persistence
```

The check verifies the original Proof Loop tables and the seeded campaign.

## Test and quality commands

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run build:cloudflare
npm run cf:dry-run
npm run seed
```

The E2E runner explicitly uses memory persistence and simulated fixtures so it does not mutate a configured production Supabase project or spend YouCam units.

## Exact judge path

1. **Fund · Brand view:** open `/demo`, choose a deterministic scenario, and activate the exact-formula hydration campaign.
2. **Match · Consumer app:** acknowledge and use the simulated judge baseline; pause on the explainable 54.2 eligibility decision and synthetic-origin disclosure.
3. **Enroll · Consumer app:** accept outcome-neutral campaign terms, enroll, and show the pending reward ledger.
4. **Trial · Consumer app:** start the ProofWindow, save the check-in, use the labeled time jump, and analyze the follow-up. The shortcut keeps the completed receipt synthetic even if live images were analyzed.
5. **Reward · Consumer app:** inspect the ProofReceipt, earned reward, provenance, and separate public ProofMap consent.
6. **Coverage · Brand view:** confirm the campaign count, origin disclosure, reward ledger, and shopper ProofMap contribution.

Use **Reset demo data** to restore deterministic state. `keep`, `swap`, and `inconclusive` remain visible presentation scenarios.

## Devpost readiness

BeautyProof is organized around the YouCam API Skin AI & Apparel VTO Hackathon rubric: a real Skin Analysis v2.1 integration, a polished consumer and brand experience, credible consumer/retail value, and a non-obvious transaction primitive that turns customer acquisition from buying attention into funding evidence.

See:

- [`docs/demo-script.md`](docs/demo-script.md)
- [`docs/devpost-submission.md`](docs/devpost-submission.md)
- [`docs/screenshots/devpost`](docs/screenshots/devpost)
- [`docs/proof-campaign-model.md`](docs/proof-campaign-model.md)
- [`docs/setup-cloudflare-workers.md`](docs/setup-cloudflare-workers.md)
- [`docs/build-notes.md`](docs/build-notes.md)

Beauty reviews should not begin with stars. They should begin with a baseline.
