# BeautyProof external setup — Cloudflare Workers

BeautyProof deploys as a full-stack Next.js application on Cloudflare Workers using the OpenNext adapter. Cloudflare Pages static export is not appropriate because BeautyProof uses server route handlers, protected YouCam and Supabase credentials, durable persistence, and server-rendered application pages.

Never paste secret values into chat, commit them, place them in a `NEXT_PUBLIC_` variable, or include them in screenshots. `.env.local`, `.dev.vars`, `.open-next/`, and `.wrangler/` are ignored by Git.

## Part 1 — Local production checks

From the repository root:

```powershell
npm install
npm run lint
npm run typecheck
npm test
npm run build:cloudflare
npm run cf:dry-run
```

The dry run should report a generated `.open-next/worker.js`, the `ASSETS` and `WORKER_SELF_REFERENCE` bindings, and an upload size below the limit for the selected Workers plan.

For a local Workers-runtime preview:

```powershell
npm run preview:cloudflare
```

Open `http://127.0.0.1:8787/api/health` and `http://127.0.0.1:8787/app`, then stop the preview with `Ctrl+C`.

## Part 2 — Push the Cloudflare configuration

```powershell
git add .
git status
git commit -m "Configure BeautyProof for Cloudflare Workers"
git push origin main
```

Before committing, confirm `.env.local` and `.dev.vars` are not listed.

## Part 3 — Connect GitHub to Cloudflare Workers Builds

1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Open **Workers & Pages**.
3. Select **Create application**.
4. Under **Import a repository**, select **Get started**.
5. Connect the GitHub account that owns `kelly0921/beautyproof`.
6. Select `kelly0921/beautyproof`.
7. Set the Worker name to exactly `beautyproof`. It must match `name` in `wrangler.jsonc`.
8. Set the production branch to `main`.
9. Leave the root directory at the repository root (`/` or blank).
10. Set **Build command** to:

   ```text
   npm run build:cloudflare
   ```

11. Set **Deploy command** to:

   ```text
   npx wrangler deploy --keep-vars
   ```

12. If Cloudflare shows a non-production branch deploy command, use:

   ```text
   npx wrangler versions upload --keep-vars
   ```

13. Select **Save and Deploy**.

The first deployment can complete without production credentials. Its `/api/health` response will not yet show durable Supabase or configured YouCam.

## Part 4 — Add runtime variables and encrypted secrets

After the Worker exists:

1. Open **Workers & Pages → beautyproof → Settings**.
2. Find **Variables and Secrets**.
3. Add these as plaintext variables:

   ```text
   SUPABASE_URL=https://hxbaqixnaauetwshqbia.supabase.co
   DEMO_MODE=true
   NEXT_PUBLIC_DEMO_MODE=true
   DEMO_SEED=20260804
   ```

4. Add `SUPABASE_SECRET_KEY` with type **Secret** and paste the current value beginning with `sb_secret_`.
5. Add `YOUCAM_API_KEY` with type **Secret** and paste only the current rotated YouCam key.
6. Select **Deploy** to attach the bindings to a new Worker version.

Do not use the Supabase publishable key for `SUPABASE_SECRET_KEY`, and do not reuse the YouCam key that was previously exposed and rotated.

Cloudflare runtime variables and encrypted secrets are available to BeautyProof through `process.env` because `nodejs_compat` is enabled.

## Part 5 — Add build-time public variables

Workers Builds variables are separate from runtime variables.

1. Copy the assigned production URL, such as `https://beautyproof.<your-subdomain>.workers.dev`.
2. Open **Settings → Build → Variables and secrets**.
3. Add:

   ```text
   NEXT_PUBLIC_APP_URL=https://beautyproof.<your-subdomain>.workers.dev
   NEXT_PUBLIC_DEMO_MODE=true
   ```

4. Return to the Worker’s runtime **Variables and Secrets** and add the same `NEXT_PUBLIC_APP_URL` as a plaintext variable.
5. Retry the latest build or push the next commit so the public values are included in the Next.js build.

Do not place `SUPABASE_SECRET_KEY` or `YOUCAM_API_KEY` in any `NEXT_PUBLIC_` variable.

## Part 6 — Production verification

Open:

```text
https://beautyproof.<your-subdomain>.workers.dev/api/health
```

Confirm the response contains:

```json
{
  "ok": true,
  "data": {
    "persistence": {
      "activeMode": "supabase",
      "durable": true
    },
    "youcamConfigured": true
  }
}
```

Then verify from a signed-out or private browser window:

1. Open `/app` and confirm the mobile-first dashboard renders.
2. Open `/demo` and complete the cached-real judge path.
3. Upload one prepared high-resolution baseline image through the live YouCam control.
4. Complete the ProofWindow and upload the prepared follow-up image.
5. Confirm the ProofReceipt labels both records **Live YouCam Skin AI v2.1**.
6. Confirm the receipt remains after reopening the application.
7. Inspect **Workers Logs** for uncaught errors or repeated timeouts.

## Part 7 — Optional custom domain

1. Open **Workers & Pages → beautyproof → Settings → Domains & Routes**.
2. Select **Add → Custom Domain**.
3. Choose a hostname already managed in the Cloudflare account, such as `beautyproof.example.com`.
4. Update `NEXT_PUBLIC_APP_URL` in both runtime variables and Workers Builds variables.
5. Trigger another build and repeat the production verification.

The `workers.dev` URL is sufficient for Devpost if no custom domain is ready.

## Troubleshooting

- Worker-name mismatch: the dashboard Worker name must be `beautyproof`, matching `wrangler.jsonc`.
- OpenNext build fails on Windows: run the build in Workers Builds or WSL; the Cloudflare build environment is Linux.
- `/api/health` reports memory persistence: add both `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as runtime values.
- `/api/health` reports invalid persistence: one of the two Supabase runtime values is missing.
- `youcamConfigured` is false: add the rotated key as the `YOUCAM_API_KEY` runtime secret and deploy the new version.
- Build variables work but runtime values do not: add the values under the Worker’s runtime **Variables and Secrets**, not only under **Settings → Build**.
- Runtime values work but client-facing public values are stale: add the `NEXT_PUBLIC_` values under **Settings → Build** and trigger a new build.
- Deployment replaces dashboard variables: keep `--keep-vars` in the deploy and preview-upload commands.
