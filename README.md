# BeautyProof

BeautyProof turns skincare marketing claims into formula-specific personal observation plans and replaces vague star ratings with standardized ProofReceipts from shoppers whose skin started with comparable measurable conditions.

**Consumer promise:** Skincare reviews from people whose skin started like yours.

**Product boundary:** BeautyProof supports cosmetic observation and personal decisions. It does not diagnose medical conditions, establish causality, or verify clinical efficacy.

## What the prototype demonstrates

The deterministic demo follows one fictional product, Aster Vale DewSignal Adaptive Serum, through:

1. A Claim Compiler that classifies hydration as YouCam-observable, finish as subjective, and barrier repair as unsupported by facial image analysis.
2. A cached-real or live YouCam v2.1 baseline using only HD moisture, redness, texture, and oiliness actions.
3. A personalized ProofMap constrained to the exact formula, selected claim, consented records, evidence policy, and comparable starting raw scores.
4. A Formula Reset that preserves historical receipts but excludes them from the current-formula aggregate by default.
5. A stored 14-day, claim-aligned ProofWindow with an under-ten-second persisted check-in, an explicitly labeled demo time jump, and a second live/cached-real YouCam measurement.
6. An iconic persisted ProofReceipt containing the authoritative stored baseline and follow-up IDs, provider task provenance, observed raw-score changes, sensory feedback, confounders, evidence quality, limitations, return time, data origin, and a conservative verdict.
7. An explicit contribution action that updates a compact Proof Coverage view.

The default judge path takes nine clicks and has no external-service dependency. The preloaded and follow-up controls call the app's API routes, while the upload and CameraKit controls call the live server-side YouCam workflow when credentials are configured.

## Product surfaces

- **`/app` — shopper app:** A mobile-first dashboard with persistent Home, Scan, Proofs, and Profile navigation. It reads real Supabase state, surfaces the next trial action, and keeps return timing and evidence history one tap away.
- **`/app/scan` — focused baseline:** A compact consent, capture, YouCam analysis, metric review, and ProofWindow setup flow built for a phone rather than a presentation page.
- **`/app/trial/[id]` — active trial:** Stored progress, an under-ten-second check-in, the explicitly labeled demo time jump, and live or cached-real follow-up analysis.
- **`/app/proofs` — evidence library:** Stored ProofReceipts with formula, claim, verdict, evidence quality, adherence, provenance, and per-receipt aggregation consent.
- **`/demo` — judge story:** The stable editorial three-minute path remains separate so the submission can explain the full product idea without compromising the repeat-user app experience.

## Architecture

- **App:** Next.js 16.2.11 App Router, React 19, strict TypeScript, Tailwind CSS plus a local accessible component layer.
- **Server APIs:** Next route handlers with Zod validation and typed error codes.
- **YouCam boundary:** `lib/youcam/service.ts` owns file initialization, presigned upload, task creation, polling, retry, and result parsing. `YOUCAM_API_KEY` is read only in this server module.
- **Evidence engines:** Curated claim configuration, normalized weighted Euclidean similarity, five-dimension quality scoring, conservative verdict rules, and exact-formula aggregates.
- **Persistence:** An async repository contract automatically selects durable Supabase when `SUPABASE_URL` and a server secret are configured. With neither value present, local development uses the active-process memory adapter. A partial configuration fails loudly. Both adapters persist the same analysis, ProofWindow, check-in, receipt, and consent model.
- **Fixtures:** Sanitized cached-real JSON keeps `raw_score` separate from `ui_score`; no face image or personal identifier is stored in the repository.
- **Tests:** Vitest unit/integration coverage and a Playwright critical-path test.

## Local setup

```powershell
git clone https://github.com/kelly0921/beautyproof.git
cd beautyproof
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3026/demo](http://localhost:3026/demo).

The app works without credentials through the cached-real fallback. Do not put secret values in variables prefixed with `NEXT_PUBLIC_`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `YOUCAM_API_KEY` | Live path only | Server-side bearer credential for YouCam v2.1. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical application URL. |
| `SUPABASE_URL` | Durable persistence | Project URL used only by the server repository. |
| `SUPABASE_SECRET_KEY` | Durable persistence | Preferred `sb_secret_...` server key. Never expose it with `NEXT_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy fallback | Legacy server-only key accepted when a new secret key is unavailable. |
| `DATABASE_URL` | Migration/production | PostgreSQL connection string. |
| `DEMO_MODE` | No | Enables server demo behavior. |
| `NEXT_PUBLIC_DEMO_MODE` | No | Exposes labeled presentation controls. |
| `DEMO_SEED` | No | Defaults to `20260804`. |

## YouCam live setup

1. Set `YOUCAM_API_KEY` in `.env.local`; never expose it to browser code.
2. Use a JPG or PNG under 10 MB with a short side of at least 1080 px. A clearly visible, front-facing face with even lighting is required.
3. POST the file to `/api/skin-analysis/upload` as multipart form data. Set `allowCachedFallback=false` when you want live failure to be surfaced instead of using the demo fixture.
4. The service initializes `/s2s/v2.1/file/skin-analysis`, uploads to the returned presigned URL, creates a JSON task with the four HD actions, and polls `/s2s/v2.1/task/skin-analysis/{task_id}`.

The **High-resolution upload** control in `/scan` performs this request directly and carries the returned metrics, stored analysis ID, provider task ID, and `live_youcam` origin into the ProofMap. At Day 14, **High-resolution follow-up upload** repeats the live workflow. The server then completes the stored ProofWindow and generates the ProofReceipt from those two authoritative analyses. Neither live control silently falls back.

CameraKit is represented by a local `hdskincare` adapter and becomes active when the licensed `window.YMK` SDK is loaded. Upload and preloaded paths remain available for devices that cannot meet HD camera requirements.

## Supabase migration and seed

The production schema and idempotent product/demo seed records are in `supabase/migrations/0001_beautyproof.sql`. The server repository automatically activates after the Supabase URL and secret key are configured. RLS is enabled with no browser table policies; all access stays behind validated server routes.

Follow [`docs/setup-cloudflare-workers.md`](docs/setup-cloudflare-workers.md) for the exact dashboard, local verification, YouCam, and Cloudflare Workers steps. After configuration, verify durable access with:

```bash
npm run check:persistence
```

Generate and inspect the deterministic cohort:

```bash
npm run seed
```

`DEMO_SEED=20260804` always creates 32 synthetic ProofReceipts across old/current formulas, hydration/redness claim lenses, all evidence-quality bands, and all six verdicts.

## Test and quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run seed
npm run screenshots
npm run check:persistence # after Supabase setup
```

The E2E project uses the locally installed Microsoft Edge channel so no extra browser download is required on the target Windows demo machine.

## Exact judge path

1. Open `/demo` and keep the default `keep` scenario.
2. Choose **See proof for my starting skin**.
3. Consent to cosmetic analysis and use the preloaded baseline.
4. Inspect the ProofMap and Formula Reset, then start a ProofWindow.
5. Save the default check-in, use the labeled demo time jump, and analyze the cached-real follow-up.
6. Inspect the ProofReceipt and choose **I consent — add my ProofReceipt**.
7. Confirm the network update in Proof Coverage.

Use **Reset demo** to restore the deterministic aggregate. Query scenarios `swap` and `inconclusive` are available through the visible demo controls before the first action.

## Devpost submission readiness

The implementation is organized around the live YouCam API Skin AI & Apparel VTO Hackathon rubric: genuine YouCam integration, a complete repeat-user app plus judge narrative, credible consumer or retail impact, and a creative understanding of the problem space.

Ready-to-paste submission copy, required-materials checklist, rubric evidence map, custom-question drafts, screenshot inventory, and recording plan are in [`docs/devpost-submission.md`](docs/devpost-submission.md). The official video should use prepared baseline and follow-up images through both live high-resolution upload controls with `YOUCAM_API_KEY` configured.

## Real and synthetic data disclosure

Prototype aggregates contain real YouCam-generated records and synthetic demonstration records used to illustrate future network scale. Every aggregateable record carries an origin field. The UI never labels mixed-origin prototype aggregates as “real users” or “live evidence,” and Proof Coverage displays origin counts.

## Privacy and limitations

- Explicit consent is required before face-image processing and before receipt aggregation.
- Numeric results and minimal metadata are retained; demo images are not persisted.
- CameraKit captures are not sent to unrelated AI services.
- Raw scores drive comparisons; motivational UI scores do not.
- A first scan is a starting measurement, not a long-term normal range.
- Evidence-quality and verdict thresholds are prototype heuristics, not medical or clinical standards.
- Inconclusive is a supported result.

## Cloudflare Workers deployment

BeautyProof is configured for Cloudflare Workers through `@opennextjs/cloudflare`. The checked-in `wrangler.jsonc` enables the Node.js compatibility required by the Next.js server bundle, public outbound fetches for Supabase and YouCam, static assets, a self-service binding, and Workers observability. Secrets remain outside source control.

Useful local commands:

```bash
npm run build:cloudflare
npm run preview:cloudflare
npm run cf:dry-run
npm run deploy:cloudflare
```

The GitHub repository should be connected to a Worker named `beautyproof` with `npm run build:cloudflare` as the build command and `npx wrangler deploy --keep-vars` as the deploy command. Add the Supabase and YouCam credentials as encrypted runtime secrets, then verify `/api/health`, `/app`, and `/demo` from a signed-out browser. Follow [`docs/setup-cloudflare-workers.md`](docs/setup-cloudflare-workers.md) for the exact dashboard steps.

Beauty reviews should not begin with stars. They should begin with a baseline.
