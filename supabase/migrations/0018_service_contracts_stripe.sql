-- =============================================================================
-- Tradevoice — service contracts Phase 2 (Stripe Connect subscriptions)
-- =============================================================================
-- Phase 1 (migration 0017) gave us schema + manual-tracking UI for recurring
-- service plans. This migration adds the Stripe-side bookkeeping needed to
-- actually charge the customer's card on a recurring basis.
--
-- Flow (per enrollment):
--   1. Owner clicks "Enroll customer" on a contract-priced plan
--   2. /api/stripe/plan-checkout lazily creates a Stripe Product + Price on
--      the contractor's CONNECTED account (acct_...), stores the IDs back
--      on `public.plans`, inserts an `incomplete` plan_subscriptions row,
--      and returns a Stripe Checkout Session URL (subscription mode)
--   3. Customer opens URL → enters card on Stripe-hosted page → Stripe
--      creates the subscription on the connected account
--   4. Webhook (Connect events) fires checkout.session.completed → we link
--      the pending row to the real stripe_subscription_id + customer_id
--   5. Subsequent customer.subscription.updated / deleted /
--      invoice.payment_succeeded / invoice.payment_failed events keep the
--      row's status + current_period_end in sync.
--
-- All money flows directly to the contractor's bank — Tradevoice does NOT
-- skim a platform fee on service contract revenue (only on per-invoice
-- payments via migration 0013).
-- =============================================================================

-- ── Plans: Connect-side product caching ─────────────────────────────────────
-- stripe_price_id was added in 0017 but only as a forward-looking column.
-- Pair it with stripe_product_id so we can detect "this plan's Price needs
-- recreating" (Stripe Prices are immutable; changing the amount means
-- creating a new Price and archiving the old one).
alter table public.plans
  add column if not exists stripe_product_id text;

-- ── plan_subscriptions: Connect-side bookkeeping ────────────────────────────
-- pending_email / pending_name let the owner kick off enrollment for a
-- customer who isn't a `clients` row yet (e.g. typed an email into the
-- enroll modal). Once Checkout completes, we have a Stripe customer; the
-- contractor can later promote them into a `clients` row.
alter table public.plan_subscriptions
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_customer_id         text,
  add column if not exists pending_email              text,
  add column if not exists pending_name               text;

create index if not exists plan_subs_stripe_session_idx
  on public.plan_subscriptions (stripe_checkout_session_id);
create index if not exists plan_subs_stripe_subscription_idx
  on public.plan_subscriptions (stripe_subscription_id);

-- ── RPC: link pending sub to Stripe after Checkout completes ────────────────
-- Called by the webhook on checkout.session.completed. We can't just match
-- on stripe_subscription_id because the row is still pending when Checkout
-- completes — we match on stripe_checkout_session_id (set at enroll time).
create or replace function public.link_plan_subscription_from_checkout(
  p_session_id       text,
  p_subscription_id  text,
  p_customer_id      text,
  p_status           text,
  p_current_period_end timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $psl1$
declare
  rows_updated int;
begin
  if p_session_id is null then
    return json_build_object('ok', false, 'error', 'missing_session_id');
  end if;

  update public.plan_subscriptions
     set stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
         stripe_customer_id     = coalesce(p_customer_id, stripe_customer_id),
         status                 = coalesce(p_status, status),
         current_period_end     = coalesce(p_current_period_end::date, current_period_end),
         updated_at             = now()
   where stripe_checkout_session_id = p_session_id;
  get diagnostics rows_updated = row_count;

  return json_build_object('ok', true, 'rows_updated', rows_updated);
end;
$psl1$;

grant execute on function public.link_plan_subscription_from_checkout(text, text, text, text, timestamptz) to service_role;

-- ── RPC: keep plan_subscriptions in sync with Stripe subscription state ─────
-- Called by the webhook on customer.subscription.* and invoice.payment_*
-- events. Matches on stripe_subscription_id (set during the checkout link).
create or replace function public.update_plan_subscription_status(
  p_subscription_id    text,
  p_status             text,
  p_current_period_end timestamptz default null,
  p_canceled_at        timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $psl2$
declare
  rows_updated int;
begin
  if p_subscription_id is null then
    return json_build_object('ok', false, 'error', 'missing_subscription_id');
  end if;

  update public.plan_subscriptions
     set status              = coalesce(p_status, status),
         current_period_end  = coalesce(p_current_period_end::date, current_period_end),
         canceled_at         = coalesce(p_canceled_at::date, canceled_at),
         updated_at          = now()
   where stripe_subscription_id = p_subscription_id;
  get diagnostics rows_updated = row_count;

  return json_build_object('ok', true, 'rows_updated', rows_updated);
end;
$psl2$;

grant execute on function public.update_plan_subscription_status(text, text, timestamptz, timestamptz) to service_role;
