-- Tradevoice — fix log_subscription_event's ON CONFLICT target
-- =============================================================================
-- subscription_events has been empty since it shipped. Diagnosed 2026-07-26:
-- every call to log_subscription_event() raised
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- The unique index DOES exist, but it is PARTIAL:
--
--   create unique index subscription_events_stripe_event_unique
--     on public.subscription_events (stripe_event_id)
--     where stripe_event_id is not null;
--
-- Postgres will only use a partial unique index for ON CONFLICT inference if
-- the statement repeats the index predicate. The function said plain
-- `on conflict (stripe_event_id)`, so inference failed and the insert threw
-- on EVERY invocation.
--
-- It was invisible because webhook.js wraps logEventForCustomer in a
-- try/catch that only console.warn's — so Stripe still got its 200, the
-- subscription status still reconciled, and the founder dashboard's
-- per-customer timeline just silently stayed empty forever.
--
-- Fix: add the predicate so the conflict target matches the partial index.
-- The partial index is correct and stays — stripe_event_id is nullable for
-- events we log ourselves rather than receiving from Stripe, and those
-- shouldn't collide with each other.
-- =============================================================================

create or replace function public.log_subscription_event(
  p_profile_id             uuid,
  p_event_type             text,
  p_status                 text        default null,
  p_amount                 numeric     default null,
  p_stripe_event_id        text        default null,
  p_stripe_subscription_id text        default null,
  p_metadata               jsonb       default '{}'::jsonb,
  p_occurred_at            timestamptz default now()
)
returns json
language plpgsql
security definer
set search_path = public
as $$
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
  -- Predicate must match subscription_events_stripe_event_unique exactly.
  on conflict (stripe_event_id) where stripe_event_id is not null do nothing
  returning id into inserted_id;

  return json_build_object('ok', true, 'id', inserted_id);
end;
$$;
