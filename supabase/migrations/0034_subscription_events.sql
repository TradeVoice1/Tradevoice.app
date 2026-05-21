-- =============================================================================
-- Tradevoice — subscription event timeline for the founder dashboard, Phase 4
-- =============================================================================
-- Phase 3 of the founder dashboard surfaces every account's CURRENT state
-- (trialing / active / past_due / canceled). Phase 4 adds the HISTORY:
-- when a contractor signed up, started their trial, paid the first month,
-- canceled, resubscribed, and so on. That's the only way to spot churn
-- patterns and resubscribe loops at a glance.
--
-- This migration adds:
--   1. subscription_events table — append-only event log keyed to
--      profile_id. Populated by the existing Stripe webhook handler
--      going forward (in this same shipset). Historical events from
--      before this migration aren't backfilled — they'd require a
--      separate Stripe Events API pull which can be a follow-up.
--   2. RLS: super-owner reads all rows; nobody else can read. No
--      INSERT/UPDATE/DELETE policies for authenticated — only the
--      service-role (used by the webhook) writes.
--   3. Idempotency index on stripe_event_id so webhook retries can't
--      double-log the same event.
--   4. SECURITY DEFINER RPC the drill-down panel calls to fetch one
--      account's timeline. Gated by is_super_owner check.
-- =============================================================================

create table if not exists public.subscription_events (
  id                      uuid primary key default uuid_generate_v4(),
  profile_id              uuid not null references public.profiles(id) on delete cascade,
  -- One of: account_created, subscription_created, subscription_updated,
  -- subscription_canceled, payment_succeeded, payment_failed, trial_ending,
  -- card_added, card_failed, resubscribed. Free-text so we don't have to
  -- migrate every time Stripe coins a new lexicon.
  event_type              text not null,
  status                  text,                                 -- subscription status at the moment of the event
  amount                  numeric(12, 2),                       -- payment amount, when applicable
  stripe_event_id         text,                                 -- for webhook-retry idempotency
  stripe_subscription_id  text,
  metadata                jsonb default '{}'::jsonb,            -- escape hatch for event-specific extras
  occurred_at             timestamptz not null default now(),
  created_at              timestamptz default now()
);

create index if not exists subscription_events_profile_idx
  on public.subscription_events (profile_id, occurred_at desc);

-- Unique partial index: stripe_event_id is unique WHEN present. Lets
-- the webhook handler insert with on-conflict-do-nothing so retries are
-- safe. NULL stripe_event_id (for app-internal events like account_created)
-- doesn't participate in uniqueness.
create unique index if not exists subscription_events_stripe_event_unique
  on public.subscription_events (stripe_event_id)
  where stripe_event_id is not null;

-- ── RLS — super-owner read only ───────────────────────────────────────────
alter table public.subscription_events enable row level security;

drop policy if exists "subscription_events: super owner read" on public.subscription_events;
create policy "subscription_events: super owner read"
  on public.subscription_events for select
  using (public.is_super_owner(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for the authenticated role — every
-- write to this table comes from the service-role webhook. Anyone
-- trying to forge events via the client SDK gets blocked by the
-- absence of a permissive policy.

-- ── RPC: get_super_owner_account_events(profile_id) ──────────────────────
-- Returns the timeline as a JSON array sorted newest-first. Same
-- super-owner gate as get_super_owner_accounts (migration 0031).
create or replace function public.get_super_owner_account_events(p_profile_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $func$
declare
  caller_is_super boolean;
begin
  select coalesce(is_super_owner, false) into caller_is_super
    from public.profiles where id = auth.uid();
  if not caller_is_super then
    return null;
  end if;

  return (
    select coalesce(json_agg(row_to_json(e) order by occurred_at desc), '[]'::json)
      from (
        select id, profile_id, event_type, status, amount,
               stripe_subscription_id, metadata, occurred_at
          from public.subscription_events
         where profile_id = p_profile_id
         order by occurred_at desc
      ) e
  );
end;
$func$;

revoke all on function public.get_super_owner_account_events(uuid) from public;
grant execute on function public.get_super_owner_account_events(uuid) to authenticated;

-- ── RPC: log_subscription_event (service-role only) ──────────────────────
-- Called from the webhook handler with on-conflict-do-nothing semantics
-- baked in. Lets the webhook log without writing its own idempotency
-- check at every callsite.
create or replace function public.log_subscription_event(
  p_profile_id            uuid,
  p_event_type            text,
  p_status                text default null,
  p_amount                numeric default null,
  p_stripe_event_id       text default null,
  p_stripe_subscription_id text default null,
  p_metadata              jsonb default '{}'::jsonb,
  p_occurred_at           timestamptz default now()
)
returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  inserted_id uuid;
begin
  insert into public.subscription_events (
    profile_id, event_type, status, amount,
    stripe_event_id, stripe_subscription_id, metadata, occurred_at
  ) values (
    p_profile_id, p_event_type, p_status, p_amount,
    p_stripe_event_id, p_stripe_subscription_id, coalesce(p_metadata, '{}'::jsonb), p_occurred_at
  )
  on conflict (stripe_event_id) do nothing
  returning id into inserted_id;

  return json_build_object('ok', true, 'id', inserted_id);
end;
$func$;

grant execute on function public.log_subscription_event(uuid, text, text, numeric, text, text, jsonb, timestamptz) to service_role;

notify pgrst, 'reload schema';
