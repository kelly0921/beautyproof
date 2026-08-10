create table if not exists brand (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null
);

create table if not exists proof_campaign (
  id text primary key,
  brand_id text not null references brand(id),
  formula_version_id text not null references formula_version(id),
  claim_id text not null references claim(id),
  title text not null,
  purpose text not null,
  status text not null check (status in ('draft', 'active', 'paused', 'completed')),
  target_receipt_count integer not null check (target_receipt_count > 0),
  target_metric_ranges_json jsonb not null default '{}'::jsonb,
  required_duration_days integer not null check (required_duration_days > 0),
  reward_type text not null check (reward_type in ('store_credit', 'cash', 'points', 'sample')),
  reward_amount_cents integer not null check (reward_amount_cents >= 0),
  reward_label text not null,
  currency text not null default 'USD' check (currency = 'USD'),
  outcome_neutral boolean not null default true check (outcome_neutral = true),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists campaign_enrollment (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references proof_campaign(id),
  user_id uuid not null references app_user(id),
  baseline_analysis_id uuid not null references skin_analysis(id),
  status text not null check (status in ('eligible', 'enrolled', 'active', 'completed', 'withdrawn')),
  eligibility_json jsonb not null,
  campaign_consent_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (campaign_id, user_id, baseline_analysis_id)
);

create table if not exists reward_ledger (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references campaign_enrollment(id) on delete cascade,
  reward_type text not null check (reward_type in ('store_credit', 'cash', 'points', 'sample')),
  reward_amount_cents integer not null check (reward_amount_cents >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'pending' check (status in ('pending', 'earned', 'issued_demo')),
  earned_at timestamptz,
  issued_at timestamptz,
  note text not null
);

alter table proof_window
  add column if not exists campaign_enrollment_id uuid references campaign_enrollment(id);

create unique index if not exists proof_window_campaign_enrollment_unique
  on proof_window (campaign_enrollment_id)
  where campaign_enrollment_id is not null;
create index if not exists proof_campaign_status_lookup on proof_campaign (status);
create index if not exists proof_campaign_formula_claim_lookup on proof_campaign (formula_version_id, claim_id);
create index if not exists campaign_enrollment_campaign_status_lookup on campaign_enrollment (campaign_id, status);
create index if not exists campaign_enrollment_user_lookup on campaign_enrollment (user_id, created_at desc);
create index if not exists reward_ledger_status_lookup on reward_ledger (status);

-- Server routes are the only data boundary. Campaign participation does not add
-- browser table policies or expose the Supabase service credential.
alter table brand enable row level security;
alter table proof_campaign enable row level security;
alter table campaign_enrollment enable row level security;
alter table reward_ledger enable row level security;

grant select, insert, update, delete on table
  brand,
  proof_campaign,
  campaign_enrollment,
  reward_ledger
to service_role;
revoke all privileges on table
  brand,
  proof_campaign,
  campaign_enrollment,
  reward_ledger
from anon, authenticated;

insert into brand (id, slug, name, description)
values (
  'brand-aster-vale',
  'aster-vale',
  'Aster Vale',
  'A fictional prestige skincare brand used to demonstrate formula-specific Proof Campaigns.'
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description;

insert into proof_campaign (
  id,
  brand_id,
  formula_version_id,
  claim_id,
  title,
  purpose,
  status,
  target_receipt_count,
  target_metric_ranges_json,
  required_duration_days,
  reward_type,
  reward_amount_cents,
  reward_label,
  currency,
  outcome_neutral,
  starts_at,
  ends_at,
  created_at
)
values (
  'campaign-dewsignal-hydration-2026',
  'brand-aster-vale',
  'formula-2026-us',
  'claim-hydration-2026',
  'DewSignal 2026 Hydration Proof Campaign',
  'Close the current-formula hydration evidence gap for shoppers starting with a moisture raw score of 60 or below.',
  'draft',
  25,
  '{"hd_moisture":{"max":60}}'::jsonb,
  14,
  'store_credit',
  1500,
  '$15 Aster Vale store credit',
  'USD',
  true,
  '2026-08-04T00:00:00Z',
  '2026-09-30T23:59:59Z',
  '2026-08-04T00:00:00Z'
)
on conflict (id) do update set
  brand_id = excluded.brand_id,
  formula_version_id = excluded.formula_version_id,
  claim_id = excluded.claim_id,
  title = excluded.title,
  purpose = excluded.purpose,
  target_receipt_count = excluded.target_receipt_count,
  target_metric_ranges_json = excluded.target_metric_ranges_json,
  required_duration_days = excluded.required_duration_days,
  reward_type = excluded.reward_type,
  reward_amount_cents = excluded.reward_amount_cents,
  reward_label = excluded.reward_label,
  currency = excluded.currency,
  outcome_neutral = excluded.outcome_neutral,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;
