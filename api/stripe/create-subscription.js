// POST /api/stripe/create-subscription
//
// Action-dispatched endpoint. Body must include `action` (defaults to
// 'create' for backward compat with the original BillingPaymentModal
// caller, which doesn't pass action):
//
//   action='create'      (or omitted)
//     Body: { userId, plan, paymentMethodId }
//     Sets the saved PM as default, creates a Subscription with 28-day
//     trial against the plan's Price ID, saves the sub + status on the
//     profile. Same behavior as before.
//
//   action='sync_seats'
//     Body: { userId }
//     Reads the contractor's active team_members count and updates their
//     subscription to have a tech-seat item (STRIPE_PRICE_TECH_SEAT) with
//     quantity = active count. Adds the item if it doesn't exist; updates
//     quantity if it does; removes it if count drops to 0. Idempotent —
//     safe to call after every add/remove.
//
// Why one endpoint with two actions: Vercel Hobby plan caps serverless
// functions at 12 per deployment and we're at that limit. Splitting this
// into a separate file would 13 → ERROR at deploy. Once on Vercel Pro
// we can re-split for cleaner organization.
//
// Plan → Price ID mapping is held in env vars so we can swap test/live
// without code changes:
//   STRIPE_PRICE_SOLO        = price_...   (Solo: 1 trade)
//   STRIPE_PRICE_PRO         = price_...   (Pro: up to 3 trades)
//   STRIPE_PRICE_ELITE       = price_...   (Elite: all 56 trades — renamed
//                                          from STRIPE_PRICE_ALL_TRADES on
//                                          2026-05-14; falls back to the
//                                          old name if still set)
//   STRIPE_PRICE_TECH_SEAT   = price_...   ($19.99/mo per extra tech)

import { stripe } from "../_lib/stripe.js";
import { getServiceClient } from "../_lib/supabase.js";

const PLAN_TO_PRICE = {
  solo: process.env.STRIPE_PRICE_SOLO,
  pro:  process.env.STRIPE_PRICE_PRO,
  // Slug stays 'all' for back-end stability — the user-facing name is "Elite"
  // (renamed 2026-05-14). New env var is STRIPE_PRICE_ELITE; we fall back to
  // the old STRIPE_PRICE_ALL_TRADES so anyone who already set that doesn't
  // get bitten by the rename.
  all:  process.env.STRIPE_PRICE_ELITE || process.env.STRIPE_PRICE_ALL_TRADES,
};

// Plan-included tech seats. The contractor doesn't pay the $19.99/seat fee
// for the first N techs on these plans — they're bundled into the base
// price. handleSyncSeats subtracts this from the billed quantity before
// updating the Stripe subscription item. Elite ($199.99) includes 2 seats
// as of 2026-05-14; Solo and Pro charge from seat #1.
const INCLUDED_SEATS = {
  solo: 0,
  pro:  0,
  all:  2,   // Elite
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const action = (req.body?.action || 'create');
  if (action === 'create')      return handleCreate(req, res);
  if (action === 'sync_seats')  return handleSyncSeats(req, res);
  return res.status(400).json({ error: 'unknown_action', detail: `action must be 'create' or 'sync_seats' (got ${JSON.stringify(action)})` });
}

// ─── handleCreate ────────────────────────────────────────────────────────────
// Original subscription-creation flow. Unchanged from the previous
// single-file version — only difference is it now lives in a function
// rather than the module's default export.
async function handleCreate(req, res) {
  const { userId, plan, paymentMethodId } = req.body || {};
  if (!userId)          return res.status(400).json({ error: 'missing_user_id' });
  if (!paymentMethodId) return res.status(400).json({ error: 'missing_payment_method' });

  const priceId = PLAN_TO_PRICE[plan] || PLAN_TO_PRICE.solo;
  if (!priceId) {
    // Hint the right env var name — note plan slug 'all' maps to ELITE.
    const envHint = plan === 'all' ? 'STRIPE_PRICE_ELITE' : `STRIPE_PRICE_${(plan||'solo').toUpperCase()}`;
    return res.status(500).json({ error: 'stripe_not_configured', detail: `No price ID for plan "${plan}". Set ${envHint} in Vercel env.` });
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

  // Idempotent — if a subscription already exists, return it instead of
  // creating a second one. Avoids double-billing on a flaky retry.
  if (profile.stripe_subscription_id) {
    try {
      const existing = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      return res.status(200).json({ subscriptionId: existing.id, status: existing.status, alreadyExisted: true });
    } catch (_) {
      // Stored sub doesn't exist on Stripe (deleted in dashboard?) — fall through and create a fresh one.
    }
  }

  try {
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
    console.error('[create-subscription:create] failed:', e);
    return res.status(500).json({ error: 'stripe_error', detail: e?.message });
  }
}

// ─── handleSyncSeats ─────────────────────────────────────────────────────────
// Reconciles the contractor's Stripe subscription tech-seat line item with
// their actual active team_members count. Called after every "buy a tech
// seat" (createTechAccount) or "remove tech" (deleteTeamMember) so the
// subscription billing reflects reality.
//
// Three states this handles:
//   1. count=0, item exists  → remove item (with proration)
//   2. count>0, item missing → add item with quantity (with proration)
//   3. count>0, item exists  → update quantity (with proration)
//   4. count=0, item missing → no-op
//
// Edge cases:
//   - Owner has no Stripe subscription yet (pre-billing-setup) → soft fail
//   - STRIPE_PRICE_TECH_SEAT env var not set → return error so owner sees it
//   - Stripe API failure → return 502 with detail
async function handleSyncSeats(req, res) {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'missing_user_id' });

  const seatPriceId = process.env.STRIPE_PRICE_TECH_SEAT;
  if (!seatPriceId) {
    return res.status(500).json({
      error: 'stripe_not_configured',
      detail: 'Set STRIPE_PRICE_TECH_SEAT in Vercel env vars to the live Tradevoice Tech Seat price ID.',
    });
  }

  const supabase = getServiceClient();

  // Pull the profile's subscription + plan + count active techs in one
  // round-trip. We need `plan` to know how many seats are included in the
  // base price — Elite gets 2 free, others get 0.
  const [{ data: profile, error: profErr }, { count: activeSeats, error: countErr }] = await Promise.all([
    supabase.from('profiles')
      .select('stripe_subscription_id, subscription_status, plan')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'active'),
  ]);

  if (profErr) {
    console.error('[create-subscription:sync_seats] profile lookup failed', profErr);
    return res.status(500).json({ error: 'profile_lookup_failed' });
  }
  if (countErr) {
    console.error('[create-subscription:sync_seats] team count failed', countErr);
    return res.status(500).json({ error: 'team_count_failed' });
  }

  const totalActive    = activeSeats || 0;
  const includedSeats  = INCLUDED_SEATS[profile?.plan] ?? 0;
  // Billed = active minus plan's free allowance, clamped to 0 so we never
  // try to charge a negative quantity.
  const billedSeats    = Math.max(0, totalActive - includedSeats);

  // No Stripe subscription yet → soft success. The seat count will be
  // synced naturally the first time billing setup runs.
  if (!profile?.stripe_subscription_id) {
    return res.status(200).json({
      ok: true,
      mode: 'deferred_no_subscription',
      activeSeats: totalActive,
      includedSeats,
      billedSeats,
      detail: 'No Stripe subscription on file yet. Seat sync skipped — will run on first billing setup.',
    });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const existing = subscription.items.data.find(i => i.price?.id === seatPriceId);

    const desired = billedSeats;
    const respBase = { ok: true, activeSeats: totalActive, includedSeats, billedSeats: desired };

    // State 1: billedSeats=0, item exists → remove it.
    if (desired === 0 && existing) {
      await stripe.subscriptionItems.del(existing.id, { proration_behavior: 'create_prorations' });
      return res.status(200).json({ ...respBase, mode: 'removed' });
    }

    // State 2: billedSeats>0, item missing → add it.
    if (desired > 0 && !existing) {
      await stripe.subscriptionItems.create({
        subscription: subscription.id,
        price:        seatPriceId,
        quantity:     desired,
        proration_behavior: 'create_prorations',
      });
      return res.status(200).json({ ...respBase, mode: 'added' });
    }

    // State 3: billedSeats>0, item exists, but quantity differs → update.
    if (desired > 0 && existing && existing.quantity !== desired) {
      await stripe.subscriptionItems.update(existing.id, {
        quantity: desired,
        proration_behavior: 'create_prorations',
      });
      return res.status(200).json({ ...respBase, mode: 'updated', previous: existing.quantity });
    }

    // State 4: already in sync (billedSeats=0 no item, or billedSeats=N
    // item-with-N).
    return res.status(200).json({ ...respBase, mode: 'noop' });
  } catch (e) {
    console.error('[create-subscription:sync_seats] stripe call failed', e);
    return res.status(502).json({ error: 'stripe_error', detail: e?.message });
  }
}
