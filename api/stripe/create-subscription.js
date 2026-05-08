// POST /api/stripe/create-subscription
// Body: { userId, plan, paymentMethodId }
//
// After the SetupIntent confirms client-side, the front-end posts back here
// with the saved payment method id. We:
//   1. Set the PM as the customer's default payment method
//   2. Create a Subscription with trial_period_days=28 against the right
//      Stripe Price ID for the plan they picked
//   3. Save the subscription id + status on the profile
//
// Plan → Price ID mapping is held in env vars so we can swap test/live
// without code changes:
//   STRIPE_PRICE_SOLO       = price_...
//   STRIPE_PRICE_PRO        = price_...
//   STRIPE_PRICE_ALL_TRADES = price_...

import { stripe } from "../_lib/stripe.js";
import { getServiceClient } from "../_lib/supabase.js";

const PLAN_TO_PRICE = {
  solo: process.env.STRIPE_PRICE_SOLO,
  pro:  process.env.STRIPE_PRICE_PRO,
  all:  process.env.STRIPE_PRICE_ALL_TRADES,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { userId, plan, paymentMethodId } = req.body || {};
  if (!userId)          return res.status(400).json({ error: 'missing_user_id' });
  if (!paymentMethodId) return res.status(400).json({ error: 'missing_payment_method' });

  const priceId = PLAN_TO_PRICE[plan] || PLAN_TO_PRICE.solo;
  if (!priceId) {
    return res.status(500).json({ error: 'stripe_not_configured', detail: `No price ID for plan "${plan}". Set STRIPE_PRICE_${(plan||'solo').toUpperCase()} in Vercel env.` });
  }

  const supabase = getServiceClient();
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle();
  if (profErr || !profile?.stripe_customer_id) {
    return res.status(400).json({ error: 'no_customer', detail: 'Run /api/stripe/setup-intent first.' });
  }

  // If they already have a subscription, just return it. Idempotent so a
  // retry from a flaky network doesn't double-bill on day 28.
  if (profile.stripe_subscription_id) {
    try {
      const existing = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      return res.status(200).json({ subscriptionId: existing.id, status: existing.status, alreadyExisted: true });
    } catch (_) {
      // The stored sub doesn't exist on Stripe (deleted in dashboard?) — fall through and create a fresh one.
    }
  }

  try {
    // Set as default PM so renewals charge it.
    await stripe.customers.update(profile.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await stripe.subscriptions.create({
      customer:           profile.stripe_customer_id,
      items:              [{ price: priceId }],
      trial_period_days:  28,
      payment_behavior:   'default_incomplete',
      payment_settings:   { save_default_payment_method: 'on_subscription' },
      expand:             ['latest_invoice.payment_intent'],
      metadata:           { tradevoice_user_id: userId, plan },
    });

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    await supabase
      .from('profiles')
      .update({
        stripe_subscription_id:   subscription.id,
        stripe_payment_method_id: paymentMethodId,
        subscription_status:      subscription.status,
        trial_ends_at:            trialEnd,
      })
      .eq('id', userId);

    return res.status(200).json({
      subscriptionId: subscription.id,
      status:         subscription.status,
      trialEndsAt:    trialEnd,
    });
  } catch (e) {
    console.error('[create-subscription] failed:', e);
    return res.status(500).json({ error: 'stripe_error', detail: e?.message });
  }
}
