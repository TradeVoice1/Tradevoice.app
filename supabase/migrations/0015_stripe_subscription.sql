-- =============================================================================
-- Tradevoice — contractor subscription billing (Stripe customer + subscription)
-- =============================================================================
-- This is the OTHER Stripe integration (the first being Connect for invoice
-- payments). Here, Tradevoice acts as the merchant and the contractor is the
-- customer. We charge them $49.99 / $99.99 / $149.99 per month after the
-- 28-day trial ends, plus $19.99/mo per active tech seat.
--
-- Flow:
--   1. New owner signs up → 4th step of SignupScreen mounts Stripe Elements
--      and asks for a card. Front-end calls /api/stripe/setup-intent which
--      creates a Stripe Customer for the contractor (saved as
--      profiles.stripe_customer_id) and a SetupIntent (no charge yet).
--   2. SetupIntent confirms client-side, attaches the PM to the customer.
--   3. We create a subscription with trial_period_days=28 and pricing
--      based on the plan they picked (saved as stripe_subscription_id).
--   4. Stripe auto-charges on day 28. Webhook fires events we handle here
--      (status flips, payment failures, cancellations).
--
-- Key fields:
--   stripe_customer_id        — `cus_...`
--   stripe_subscription_id    — `sub_...`
--   stripe_payment_method_id  — `pm_...` (default PM)
--   trial_ends_at             — when Stripe will start charging
--   subscription_status       — trialing | active | past_due | canceled |
--                                unpaid | incomplete | incomplete_expired
--                                (Stripe's own lexicon mirrored)
-- =============================================================================

alter table public.profiles
  add column if not exists stripe_customer_id        text,
  add column if not exists stripe_subscription_id    text,
  add column if not exists stripe_payment_method_id  text,
  add column if not exists trial_ends_at             timestamptz,
  add column if not exists subscription_status       text default 'trialing';

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);
create index if not exists profiles_stripe_subscription_idx
  on public.profiles (stripe_subscription_id);

-- Webhook-driven: when subscription events fire, the webhook handler calls
-- this RPC to update the user's subscription state. Service-role only.
create or replace function public.update_subscription_status(
  p_customer_id      text,
  p_subscription_id  text,
  p_status           text,
  p_trial_ends_at    timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_updated int;
begin
  if p_customer_id is null then
    return json_build_object('ok', false, 'error', 'missing_customer_id');
  end if;

  update public.profiles
     set stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
         subscription_status    = coalesce(p_status, subscription_status),
         trial_ends_at          = coalesce(p_trial_ends_at, trial_ends_at)
   where stripe_customer_id = p_customer_id;
  get diagnostics rows_updated = row_count;

  return json_build_object('ok', true, 'rows_updated', rows_updated);
end;
$$;

grant execute on function public.update_subscription_status(text, text, text, timestamptz) to service_role;
