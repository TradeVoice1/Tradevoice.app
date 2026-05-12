// Plan subscriptions — customer enrollments in a recurring maintenance plan.
// Owner-managed. Each row is a single customer subscribed to a single plan
// for a recurring fee. RLS scopes to the owner (techs read-only).
//
// Phase 1: contractor manages enrollments manually (status flips driven by
// the owner UI). Phase 2: real Stripe Connect subscriptions auto-bill the
// customer monthly/yearly, webhook keeps status in sync.

import { supabase } from "../supabase";

const dbToSub = (r) => ({
  id:                    r.id,
  planId:                r.plan_id,
  clientId:              r.client_id ?? null,
  billingAmount:         r.billing_amount   != null ? Number(r.billing_amount) : 0,
  billingInterval:       r.billing_interval ?? 'month',
  billingCurrency:       r.billing_currency ?? 'usd',
  status:                r.status           ?? 'active',
  startedAt:             r.started_at       ?? null,
  currentPeriodEnd:      r.current_period_end ?? null,
  canceledAt:            r.canceled_at      ?? null,
  stripeSubscriptionId:  r.stripe_subscription_id ?? null,
  stripeCheckoutSessionId: r.stripe_checkout_session_id ?? null,
  stripeCustomerId:      r.stripe_customer_id ?? null,
  pendingEmail:          r.pending_email    ?? null,
  pendingName:           r.pending_name     ?? null,
  notes:                 r.notes            ?? '',
  createdAt:             r.created_at       ?? null,
});

const subToDb = (s) => ({
  plan_id:                 s.planId,
  client_id:               s.clientId || null,
  billing_amount:          s.billingAmount != null && s.billingAmount !== '' ? Number(s.billingAmount) : 0,
  billing_interval:        s.billingInterval || 'month',
  billing_currency:        s.billingCurrency || 'usd',
  status:                  s.status || 'active',
  started_at:              s.startedAt || null,
  current_period_end:      s.currentPeriodEnd || null,
  canceled_at:             s.canceledAt || null,
  stripe_subscription_id:  s.stripeSubscriptionId || null,
  notes:                   s.notes ?? null,
});

export async function listPlanSubscriptions() {
  const { data, error } = await supabase
    .from('plan_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToSub);
}

export async function listPlanSubscriptionsByPlan(planId) {
  const { data, error } = await supabase
    .from('plan_subscriptions')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToSub);
}

export async function upsertPlanSubscription(ownerId, sub) {
  const dbRow = subToDb(sub);
  const looksLikeUuid = typeof sub.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub.id);

  if (looksLikeUuid) {
    const { data, error } = await supabase
      .from('plan_subscriptions')
      .update(dbRow)
      .eq('id', sub.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return dbToSub(data);
  }

  const { data, error } = await supabase
    .from('plan_subscriptions')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (error) throw error;
  return dbToSub(data);
}

export async function cancelPlanSubscription(id) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('plan_subscriptions')
    .update({ status: 'canceled', canceled_at: today })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return dbToSub(data);
}

export async function deletePlanSubscription(id) {
  const { error } = await supabase.from('plan_subscriptions').delete().eq('id', id);
  if (error) throw error;
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Compute monthly recurring revenue (MRR) from a list of active subs.
// Normalizes yearly subs to monthly equivalent.
export function calcMrr(subs) {
  const active = (subs || []).filter(s => s.status === 'active');
  let mrr = 0;
  for (const s of active) {
    const amt = Number(s.billingAmount) || 0;
    if (s.billingInterval === 'year') mrr += amt / 12;
    else                              mrr += amt;
  }
  return Math.round(mrr * 100) / 100;
}

// Annual recurring revenue.
export function calcArr(subs) {
  return Math.round(calcMrr(subs) * 12 * 100) / 100;
}

// Subscriber count by status — used by the dashboard widget.
export function countByStatus(subs) {
  const c = { active: 0, past_due: 0, canceled: 0, paused: 0, incomplete: 0, trialing: 0 };
  for (const s of (subs || [])) {
    if (c[s.status] != null) c[s.status] += 1;
  }
  return c;
}

// ── Stripe-wired enrollment (Phase 2) ────────────────────────────────────
//
// Server-side endpoint creates the Stripe Product/Price on the contractor's
// connected account (if needed), inserts a pending plan_subscriptions row,
// and returns a Stripe Checkout Session URL. Webhook flips the row to
// 'active' once the customer enters their card.
export async function startEnrollmentCheckout({ ownerId, planId, clientId, customerEmail, customerName, returnUrl }) {
  const resp = await fetch('/api/stripe/plan-checkout', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, planId, clientId, customerEmail, customerName, returnUrl }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.detail || body.error || 'Could not start enrollment.');
    err.code = body.error;
    throw err;
  }
  return body; // { checkoutUrl, sessionId, pendingSubId, stripePriceId, stripeProductId }
}

// Cancel a subscription on the contractor's Connect account. `immediate`
// defaults to false (cancel at period end so the customer keeps coverage
// they already paid for). Webhook will reconcile final state.
export async function cancelEnrollmentSubscription({ ownerId, planSubscriptionId, immediate = false }) {
  const resp = await fetch('/api/stripe/plan-cancel-subscription', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, planSubscriptionId, immediate }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.detail || body.error || 'Could not cancel subscription.');
    err.code = body.error;
    throw err;
  }
  return body;
}
