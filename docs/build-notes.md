# BeautyProof build notes

## Proof Campaign upgrade

The upgrade is additive to the existing Next.js App Router, repository, YouCam, Supabase, and Cloudflare Worker architecture.

New runtime records:

- `brand`
- `proof_campaign`
- `campaign_enrollment`
- `reward_ledger`
- Optional `proof_window.campaign_enrollment_id`

Apply `supabase/migrations/0002_proof_campaigns.sql` after `0001_beautyproof.sql`, followed by `0003_provenance_hardening.sql`. Do not rewrite or reapply `0001` manually.

No new production secret is required. Campaign configuration and the prototype reward ledger are database records. Existing Supabase and YouCam credentials remain server-only.

The deterministic test runner explicitly uses memory persistence and simulated YouCam-format fixtures so local E2E checks never mutate the configured production database or create records labeled as real evidence.

The Devpost screenshot runner uses the same isolation. `npm run screenshots` rebuilds the seven-image judge sequence in `docs/screenshots/devpost` without writing to Supabase or calling live YouCam analysis.

## Required verification

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

After applying `0002` and `0003` to Supabase:

```powershell
npm run check:persistence
```

The persistence check now verifies both the original Proof Loop tables and the seeded Aster Vale Proof Campaign.

## Public demo safety and mobile continuity

- Production mutations require a same-origin browser request before the shared prototype database can change.
- Demo reset removes only synthetic analyses and their dependent demo workflows. Live YouCam analyses are preserved.
- Cloudflare rate-limit bindings protect the paid YouCam upload route at 6 valid attempts per visitor and 30 for the site per minute. No new secret or database migration is required.
- Standalone analyses are listed from persistence and can be resumed into a 14-day ProofWindow after a refresh or return visit.
- The baseline result shows YouCam's hydration mask when provided. Comparisons still use the numeric raw score.
- Baseline and follow-up inputs omit the HTML `capture` hint so iPhone users can choose either the camera or photo library.
