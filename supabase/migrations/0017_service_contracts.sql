-- =============================================================================
-- Tradevoice — recurring service contracts (subscription billing for plans)
-- =============================================================================
-- A maintenance plan (migration 0005) was originally just a schedule —
-- "annual HVAC tune-up", auto-creates jobs. This migration adds the BILLING
-- layer: the contractor charges the customer a recurring fee for being on
-- the plan, separate from the per-visit invoice.
--
-- Example use case:
--   - HVAC contractor offers "Comfort Club — $25/mo" that includes 2 tune-ups
--     per year + 10% off any repairs + priority scheduling
--   - Customer enrolls; Tradevoice tracks the subscription
--   - Stripe auto-charges the card each month (Phase 2 — wired up once
--     Stripe Connect setup is fully live)
--   - Per-visit invoices for actual work are SEPARATE from the monthly fee
--
-- Phase 1 (this migration + UI tonight):
--   - Schema for billing terms + subscription tracking
--   - Contractor manages enrollments manually
--   - Recurring-revenue summary on Dashboard + Billing screen
--
-- Phase 2 (later, once Stripe Connect production keys are live):
--   - Stripe Price created per plan
--   - Stripe Subscription created per enrollment
--   - Webhook keeps status in sync
-- =============================================================================

-- ── Billing terms on the plan itself ─────────────────────────────────────
alter table public.plans
  add column if not exists billing_amount   numeric(10,2),
  add column if not exists billing_interval text default 'month',
  add column if not exists billing_currency text default 'usd',
  add column if not exists stripe_price_id  text,
  -- A short customer-facing description of what the plan includes. Shown
  -- on the enrollment page + on emailed receipts. e.g. "2 tune-ups + 10%
  -- off repairs + priority scheduling".
  add column if not exists customer_benefits text;

-- ── Enrollments / subscriptions ──────────────────────────────────────────
create table if not exists public.plan_subscriptions (
  id                       uuid primary key default uuid_generate_v4(),
  owner_id                 uuid not null references auth.users(id) on delete cascade,
  plan_id                  uuid not null references public.plans(id) on delete cascade,
  client_id                uuid references public.clients(id) on delete set null,
  -- Snapshot of billing terms at enrollment time so historical accuracy
  -- survives later edits to the parent plan's pricing.
  billing_amount           numeric(10,2) not null,
  billing_interval         text not null default 'month',
  billing_currency         text not null default 'usd',
  status                   text not null default 'active',  -- active|past_due|canceled|paused
  started_at               date not null default current_date,
  current_period_end       date,
  canceled_at              date,
  -- Filled in by Stripe wire-up once Connect is live.
  stripe_subscription_id   text,
  notes                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists plan_subs_owner_idx       on public.plan_subscriptions (owner_id);
create index if not exists plan_subs_plan_idx        on public.plan_subscriptions (plan_id);
create index if not exists plan_subs_client_idx      on public.plan_subscriptions (client_id);
create index if not exists plan_subs_owner_status_idx on public.plan_subscriptions (owner_id, status);

alter table public.plan_subscriptions enable row level security;

-- Owner: full control. Tech: read-only (so the tech can see who's on a plan
-- when they show up to a service visit, but can't change enrollment state).
drop policy if exists "plan_subs: owner all"  on public.plan_subscriptions;
drop policy if exists "plan_subs: tech read"  on public.plan_subscriptions;

create policy "plan_subs: owner all"
  on public.plan_subscriptions for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "plan_subs: tech read"
  on public.plan_subscriptions for select
  using (owner_id = public.tradevoice_my_owner_id());

-- updated_at trigger
drop trigger if exists set_updated_at on public.plan_subscriptions;
create trigger set_updated_at before update on public.plan_subscriptions
  for each row execute function public.set_updated_at();
