# BeautyProof external setup — exact steps

BeautyProof runs locally without credentials, but two external configurations are required to verify the production iteration:

1. Supabase for restart-safe records.
2. YouCam API for genuine live baseline and follow-up analysis.

Do not paste either secret into chat, commit it, place it in a `NEXT_PUBLIC_` variable, or include it in screenshots. `.env.local` and `.vercel/` are ignored by Git.

## Part 1 — Create the Supabase project

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. Choose **New project**.
3. Select or create an organization.
4. Set the project name to `beautyproof`.
5. Generate and save the database password in a password manager. BeautyProof does not place this password in the application environment.
6. Select the region closest to the Vercel deployment region and intended judges.
7. Turn **Enable Data API** on.
8. Turn **Automatically expose new tables** off. The BeautyProof migration grants only the server role the required table privileges.
9. Turn **Enable automatic RLS** on. The migration also explicitly enables RLS on every application table.
10. Keep **Postgres — Default** selected. Do not select the OrioleDB alpha option.
11. Leave Advanced Configuration at its defaults.
12. Choose a plan and select **Create new project**.
13. Wait until the project reports that it is ready.

## Part 2 — Apply the BeautyProof schema

1. In Supabase, open **SQL Editor**.
2. Choose **New query**.
3. Open `supabase/migrations/0001_beautyproof.sql` from this repository.
4. Copy the entire file into the Supabase query editor.
5. Select **Run** once.
6. Confirm that the query completes without an error.
7. Open **Table Editor** and verify these tables exist:
   - `app_user`
   - `product`
   - `formula_version`
   - `claim`
   - `skin_analysis`
   - `proof_window`
   - `check_in`
   - `proof_receipt`
8. Open `product` and confirm the seeded `product-dewsignal` row exists.
9. Open `app_user` and confirm the `BeautyProof Demo` row exists.

If the migration fails, copy only the error message—not any credentials—and share that error for diagnosis.

## Part 3 — Create the server-only Supabase key

1. In the Supabase project, open **Settings → API Keys**.
2. Copy the **Project URL**. It looks like `https://your-project-ref.supabase.co`.
3. Under **Secret keys**, create a key named `beautyproof-vercel` if one does not already exist.
4. Copy the value beginning with `sb_secret_` directly into your password manager.
5. Do not use the publishable key or legacy `anon` key for the server repository.

Supabase secret keys bypass RLS and have full data access. Never expose this key to browser code.

## Part 4 — Configure and verify Supabase locally

1. In `apps/beautyproof`, copy `.env.example` to `.env.local`:

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Open `.env.local` in a local editor.
3. Set these values:

   ```dotenv
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_your_value
   NEXT_PUBLIC_APP_URL=http://localhost:3026
   ```

4. Leave `SUPABASE_SERVICE_ROLE_KEY` empty when using the new secret key.
5. From `apps/beautyproof`, run:

   ```powershell
   npm run check:persistence
   ```

6. The command should report `Adapter: supabase` and show record counts.
7. Start the app:

   ```powershell
   npm run dev
   ```

8. Open [http://localhost:3026/api/health](http://localhost:3026/api/health).
9. Confirm the JSON contains:

   ```json
   {
     "ok": true,
     "data": {
       "persistence": {
         "activeMode": "supabase",
         "durable": true
       }
     }
   }
   ```

10. Run the cached-real demo once, stop the development server, restart it, and open `/api/health` again. The stored record counts should remain present until **Reset demo** is used.

## Part 5 — Create the YouCam API key

1. Register for the [YouCam API Skin AI & Apparel VTO Hackathon](https://youcam-api.devpost.com/) if registration is not already complete.
2. Find the participant redeem code sent by the organizer.
3. Open the [YouCam API Console](https://yce.perfectcorp.com/api-console/en/account-settings/) and create or verify the YouCam account.
4. In the console, open **Account → Redeem Code**, enter the participant code, and confirm the API units were added.
5. Open the console’s **API Keys** area.
6. Create or copy the server API key.
7. Add it only to `.env.local`:

   ```dotenv
   YOUCAM_API_KEY=your_server_api_key
   ```

8. Restart `npm run dev` after changing `.env.local`.
9. Open `/api/health` and confirm `youcamConfigured` is `true`.
10. Prepare two consented JPG or PNG images for the same adult participant:
    - one baseline image;
    - one Day 14/follow-up demonstration image;
    - each under 10 MB;
    - each with a short side of at least 1080 px;
    - front-facing, evenly lit, and free of third-party branding.
11. Run `/demo`, choose **High-resolution upload** for the baseline, and choose **High-resolution follow-up upload** at Day 14.
12. Confirm the ProofReceipt provenance ledger labels both records **Live YouCam Skin AI v2.1**.

BeautyProof does not retain the image in its own database. It stores numeric output, minimal capture validity metadata, and provider task provenance.

## Part 6 — Deploy through the Vercel dashboard

1. Push the repository to GitHub or another Git provider supported by Vercel.
2. Open [Vercel Dashboard](https://vercel.com/dashboard) and choose **Add New… → Project**.
3. Import the repository.
4. In the import configuration, set **Root Directory** to `apps/beautyproof`.
5. Confirm the framework preset is **Next.js**.
6. Use these build settings:
   - Install command: `npm install --workspaces=false`
   - Build command: `npm run build`
   - Output directory: leave blank so Next.js is detected automatically.
7. Add these environment variables for **Production**, **Preview**, and **Development**:

   ```text
   SUPABASE_URL
   SUPABASE_SECRET_KEY
   YOUCAM_API_KEY
   DEMO_MODE=true
   NEXT_PUBLIC_DEMO_MODE=true
   DEMO_SEED=20260804
   ```

8. Do not add `SUPABASE_SECRET_KEY` or `YOUCAM_API_KEY` with a `NEXT_PUBLIC_` prefix.
9. Choose **Deploy**.
10. After deployment, open `https://your-deployment.vercel.app/api/health`.
11. Confirm `ok`, `durable`, and `youcamConfigured` are all true.
12. In Vercel project settings, add the production URL as `NEXT_PUBLIC_APP_URL`, then redeploy.
13. Run the full cached-real judge path from a signed-out browser.
14. Run the live two-image path once and confirm both YouCam origins on the ProofReceipt.
15. Use the production URL in the repository README, demo video description, and Devpost submission.

## Troubleshooting checklist

- `mode: invalid`: one of `SUPABASE_URL` or `SUPABASE_SECRET_KEY` is missing.
- `relation does not exist`: run the complete migration in the correct Supabase project.
- `401` from Supabase: verify the key begins with `sb_secret_`, is active, and is only used on the server.
- foreign-key error when creating a ProofWindow: rerun the seed section of the migration and confirm the product, formulas, claims, and demo user exist.
- YouCam `MISSING_CREDENTIAL`: add `YOUCAM_API_KEY` and restart the server.
- YouCam image validation error: use JPG/PNG under 10 MB with a short side of at least 1080 px.
- Vercel builds the wrong package: set Root Directory to `apps/beautyproof`.
