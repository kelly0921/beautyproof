create extension if not exists "pgcrypto";

create type data_origin as enum ('real', 'synthetic');
create type analysis_origin as enum ('live_youcam', 'cached_real_youcam', 'synthetic');
create type evidence_quality as enum ('high', 'moderate', 'limited', 'inconclusive');
create type proof_verdict as enum ('keep', 'swap', 'continue', 'pause', 'return', 'inconclusive');

create table app_user (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  consent_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table product (
  id text primary key,
  slug text not null unique,
  brand_name text not null,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  image_asset text not null,
  return_policy_days integer not null check (return_policy_days > 0)
);

create table formula_version (
  id text primary key,
  product_id text not null references product(id),
  version_label text not null,
  region text not null,
  release_date date not null,
  is_current boolean not null default false,
  formula_summary text not null,
  fingerprint text not null unique
);

create table claim (
  id text primary key,
  formula_version_id text not null references formula_version(id),
  claim_text text not null,
  claim_type text not null,
  primary_metric text,
  secondary_metrics_json jsonb not null default '[]'::jsonb,
  brand_claim_period_days integer,
  compiler_explanation text not null
);

create table skin_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id),
  captured_at timestamptz not null default now(),
  provider_task_id text,
  source_type text not null,
  api_version text not null,
  capture_mode text not null,
  metrics_json jsonb not null,
  ui_scores_json jsonb,
  mask_urls_json jsonb not null default '{}'::jsonb,
  validity_json jsonb not null,
  origin analysis_origin not null
);

create table recommendation (
  id text primary key,
  source_name text not null,
  source_type text not null,
  formula_version_id text not null references formula_version(id),
  claim_id text not null references claim(id),
  published_at timestamptz not null,
  content_url_nullable text
);

create table proof_window (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id),
  formula_version_id text not null references formula_version(id),
  claim_id text not null references claim(id),
  recommendation_id_nullable text references recommendation(id),
  baseline_analysis_id uuid not null references skin_analysis(id),
  start_date date not null,
  planned_end_date date not null,
  return_deadline date not null,
  status text not null,
  routine_stability_status text not null
);

create table check_in (
  id uuid primary key default gen_random_uuid(),
  proof_window_id uuid not null references proof_window(id) on delete cascade,
  checkin_date date not null,
  used_product boolean not null,
  experience text not null,
  confounder_note_nullable text
);

create table proof_receipt (
  id uuid primary key default gen_random_uuid(),
  proof_window_id uuid not null unique references proof_window(id),
  followup_analysis_id uuid not null references skin_analysis(id),
  adherence_rate numeric(5,4) not null,
  evidence_quality evidence_quality not null,
  verdict proof_verdict not null,
  observations_json jsonb not null,
  subjective_feedback_json jsonb not null,
  limitations_json jsonb not null,
  consent_to_aggregate boolean not null default false,
  origin data_origin not null,
  created_at timestamptz not null default now()
);

create index proof_receipt_aggregate_lookup on proof_receipt (consent_to_aggregate, evidence_quality, origin);
create index proof_window_formula_claim_lookup on proof_window (formula_version_id, claim_id);

-- All application database access is server-side. The Supabase secret key bypasses
-- RLS; browser publishable keys receive no direct table policies in this prototype.
alter table app_user enable row level security;
alter table product enable row level security;
alter table formula_version enable row level security;
alter table claim enable row level security;
alter table skin_analysis enable row level security;
alter table recommendation enable row level security;
alter table proof_window enable row level security;
alter table check_in enable row level security;
alter table proof_receipt enable row level security;

-- The project is created with "Automatically expose new tables" disabled.
-- Grant the Data API's elevated server role only the application privileges it
-- needs. Browser roles intentionally receive no direct table privileges.
grant usage on schema public to service_role;
grant select, insert, update, delete on table
  app_user,
  product,
  formula_version,
  claim,
  skin_analysis,
  recommendation,
  proof_window,
  check_in,
  proof_receipt
to service_role;
revoke all privileges on table
  app_user,
  product,
  formula_version,
  claim,
  skin_analysis,
  recommendation,
  proof_window,
  check_in,
  proof_receipt
from anon, authenticated;

insert into app_user (id, display_name, consent_status)
values ('00000000-0000-4000-8000-000000000026', 'BeautyProof Demo', 'explicit-per-action')
on conflict (id) do update set display_name = excluded.display_name, consent_status = excluded.consent_status;

insert into product (id, slug, brand_name, name, price_cents, image_asset, return_policy_days)
values ('product-dewsignal', 'dewsignal', 'Aster Vale', 'DewSignal Adaptive Serum', 11800, 'original-css-packshot', 30)
on conflict (id) do update set slug = excluded.slug, brand_name = excluded.brand_name, name = excluded.name, price_cents = excluded.price_cents, image_asset = excluded.image_asset, return_policy_days = excluded.return_policy_days;

insert into formula_version (id, product_id, version_label, region, release_date, is_current, formula_summary, fingerprint)
values
  ('formula-2024-original', 'product-dewsignal', '2024 Original Formula', 'US', '2024-03-12', false, 'Richer gel-serum texture with the original humectant blend.', 'av-ds-us-2024-a1'),
  ('formula-2026-us', 'product-dewsignal', '2026 US Formula', 'US', '2026-05-18', true, 'Lighter emulsion texture with an updated humectant blend and reduced fragrance.', 'av-ds-us-2026-b3')
on conflict (id) do update set version_label = excluded.version_label, region = excluded.region, release_date = excluded.release_date, is_current = excluded.is_current, formula_summary = excluded.formula_summary, fingerprint = excluded.fingerprint;

insert into claim (id, formula_version_id, claim_text, claim_type, primary_metric, secondary_metrics_json, brand_claim_period_days, compiler_explanation)
values
  ('claim-hydration-2026', 'formula-2026-us', 'Visible hydration in 14 days.', 'youcam_observable', 'hd_moisture', '["hd_redness","hd_texture","hd_oiliness"]'::jsonb, 14, 'YouCam moisture raw scores can be compared at a guided baseline and follow-up.'),
  ('claim-finish-2026', 'formula-2026-us', 'Lightweight, cushiony finish.', 'subjective', null, '[]'::jsonb, null, 'Finish is a sensory experience and is collected separately from image analysis.'),
  ('claim-barrier-2026', 'formula-2026-us', 'Repairs the skin barrier.', 'unsupported', null, '[]'::jsonb, null, 'BeautyProof cannot establish this claim from a facial image analysis.')
on conflict (id) do update set claim_text = excluded.claim_text, claim_type = excluded.claim_type, primary_metric = excluded.primary_metric, secondary_metrics_json = excluded.secondary_metrics_json, brand_claim_period_days = excluded.brand_claim_period_days, compiler_explanation = excluded.compiler_explanation;

insert into recommendation (id, source_name, source_type, formula_version_id, claim_id, published_at, content_url_nullable)
values ('recommendation-mira-rowan', 'Mira Rowan / Field Notes', 'fictional_creator', 'formula-2026-us', 'claim-hydration-2026', '2026-06-03T12:00:00Z', null)
on conflict (id) do update set source_name = excluded.source_name, source_type = excluded.source_type, formula_version_id = excluded.formula_version_id, claim_id = excluded.claim_id, published_at = excluded.published_at;
