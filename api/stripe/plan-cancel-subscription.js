// POST /api/stripe/plan-cancel-subscription
// Body: { ownerId, planSubscriptionId, immediate? }
//
// Owner-initiated: cancel a customer's service-contract subscription on
// the contractor's connected Stripe account. Default is "cancel at period
// end" so the customer keeps coverage they already paid for; pass
// `immediate: true` for an immediate cancellation (no refund of the
// current period).
//
// We update plan_subscriptions optimistically; the webhook will
// eventually fire customer.subscription.deleted (or updated for
// cancel-at-period-end) and confirm the state.

import { stripe } from "../_lib/stripe.js";
import { getServiceClient } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { ownerId, planSubscriptionId, immediate } = req.body || {};
  if (!ownerId)            return res.status(400).json({ error: 'missing_owner_id' });
  if (!planSubscriptionId) return res.status(400).json({ error: 'missing_plan_subscription_id' });

  const supabase = getServiceClient();

  const { data: row, error: rowErr } = await supabase
    .from('plan_subscriptions')
    .select('id, owner_id, stripe_subscription_id, status')
    .eq('id', planSubscriptionId)
    .maybeSingle();
  if (rowErr || !row) {
    return res.status(404).json({ error: 'plan_subscription_not_found' });
  }
  if (row.owner_id !== ownerId) {
    return res.status(403).json({ error: 'not_owner' });
  }

  // If there's no Stripe sub yet (still pending or never wired), just flip
  // the row's status — nothing to call Stripe with.
  if (!row.stripe_subscription_id) {
    const today = new Date().toISOString().split('T')[0];
    const { error: updErr } = await supabase
      .from('plan_subscriptions')
      .update({ status: 'canceled', canceled_at: today })
      .eq('id', planSubscriptionId);
    if (updErr) return res.status(500).json({ error: 'update_failed', detail: updErr.message });
    return res.status(200).json({ ok: true, mode: 'local_only' });
  }

  // Need the contractor's connected account ID — every Connect Stripe call
  // is scoped via the Stripe-Account header.
  const { data: owner } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', ownerId)
    .maybeSingle();
  if (!owner?.stripe_account_id) {
    return res.status(400).json({ error: 'connect_not_setup' });
  }
  const stripeAccount = owner.stripe_account_id;

  try {
    let stripeSub;
    if (immediate) {
      stripeSub = await stripe.subscriptions.cancel(row.stripe_subscription_id, undefined, { stripeAccount });
    } else {
      stripeSub = await stripe.subscriptions.update(row.stripe_subscription_id, {
        cancel_at_period_end: true,
      }, { stripeAccount });
    }

    // Optimistic local update; webhook will reconcile.
    const today = new Date().toISOString().split('T')[0];
    const patch = immediate
      ? { status: 'canceled', canceled_at: today }
      : { status: stripeSub.status }; // typically 'active' with cancel_at_period_end=true
    await supabase
      .from('plan_subscriptions')
      .update(patch)
      .eq('id', planSubscriptionId);

    return res.status(200).json({
      ok:                     true,
      mode:                   immediate ? 'immediate' : 'at_period_end',
      stripeStatus:           stripeSub.status,
      cancelAtPeriodEnd:      !!stripeSub.cancel_at_period_end,
    });
  } catch (e) {
    console.error('[plan-cancel-subscription] failed:', e);
    return res.status(500).json({ error: 'stripe_error', detail: e?.message });
  }
}
