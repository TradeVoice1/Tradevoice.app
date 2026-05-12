// POST /api/stripe/plan-checkout
// Body: { ownerId, planId, clientId?, customerEmail?, customerName?, returnUrl? }
//
// Owner-initiated: starts a recurring subscription for a maintenance plan on
// the contractor's CONNECTED Stripe account. Idempotently creates a Stripe
// Product + Price for the plan (Stripe Prices are immutable, so if the
// plan's billing terms changed since we last synced, we archive + recreate).
//
// Returns a Stripe Checkout Session URL the contractor can hand to the
// customer (or open with the customer present). The webhook handler will
// upgrade the pending plan_subscriptions row to active once Checkout
// completes.
//
// Trust model: this endpoint is owner-only — we verify the requested planId
// belongs to the ownerId (RPC checks via service-role on profiles join).
// No client-side amounts are accepted; pricing is read from public.plans.

import { stripe } from "../_lib/stripe.js";
import { getServiceClient } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { ownerId, planId, clientId, customerEmail, customerName, returnUrl } = req.body || {};
  if (!ownerId) return res.status(400).json({ error: 'missing_owner_id' });
  if (!planId)  return res.status(400).json({ error: 'missing_plan_id' });

  const supabase = getServiceClient();

  // Look up plan + contractor's connected account in one shot.
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('id, owner_id, title, customer_benefits, billing_amount, billing_interval, billing_currency, stripe_product_id, stripe_price_id')
    .eq('id', planId)
    .maybeSingle();
  if (planErr || !plan) {
    return res.status(404).json({ error: 'plan_not_found' });
  }
  if (plan.owner_id !== ownerId) {
    return res.status(403).json({ error: 'plan_not_owned_by_caller' });
  }
  if (!plan.billing_amount || Number(plan.billing_amount) <= 0) {
    return res.status(400).json({ error: 'plan_has_no_billing_terms', detail: 'Set a subscription price on the plan first.' });
  }

  const { data: owner, error: ownErr } = await supabase
    .from('profiles')
    .select('stripe_account_id, stripe_account_charges_enabled, company, name')
    .eq('id', ownerId)
    .maybeSingle();
  if (ownErr || !owner?.stripe_account_id) {
    return res.status(400).json({ error: 'connect_not_setup', detail: 'Connect your Stripe account before enrolling customers.' });
  }
  if (!owner.stripe_account_charges_enabled) {
    return res.status(400).json({ error: 'connect_not_ready', detail: 'Stripe has not yet enabled charges on your connected account.' });
  }

  const stripeAccount = owner.stripe_account_id;
  const currency      = (plan.billing_currency || 'usd').toLowerCase();
  const interval      = plan.billing_interval === 'year' ? 'year' : 'month';
  const unitAmount    = Math.round(Number(plan.billing_amount) * 100);

  // If a client_id was supplied, pull their email for prefill.
  let clientEmail = customerEmail || null;
  let clientName  = customerName  || null;
  if (clientId && !clientEmail) {
    const { data: client } = await supabase
      .from('clients')
      .select('email, name')
      .eq('id', clientId)
      .maybeSingle();
    if (client) {
      clientEmail = client.email || null;
      clientName  = clientName || client.name || null;
    }
  }

  try {
    // ── Ensure Product exists on the connected account ────────────────────
    let productId = plan.stripe_product_id || null;
    if (productId) {
      try {
        const existing = await stripe.products.retrieve(productId, { stripeAccount });
        if (!existing.active) {
          await stripe.products.update(productId, { active: true }, { stripeAccount });
        }
      } catch (_) {
        productId = null; // product was deleted on Stripe — fall through and recreate
      }
    }
    if (!productId) {
      const product = await stripe.products.create({
        name: plan.title || 'Service Contract',
        description: plan.customer_benefits || undefined,
        metadata: { tradevoice_plan_id: plan.id, tradevoice_owner_id: ownerId },
      }, { stripeAccount });
      productId = product.id;
    }

    // ── Ensure Price matches current billing terms ─────────────────────────
    // Prices are immutable. If amount/interval/currency drifted, archive
    // the old one and create a new Price.
    let priceId = plan.stripe_price_id || null;
    if (priceId) {
      try {
        const existing = await stripe.prices.retrieve(priceId, { stripeAccount });
        const intervalMatches = existing.recurring?.interval === interval;
        const drift = !existing.active
          || existing.unit_amount !== unitAmount
          || existing.currency !== currency
          || !intervalMatches;
        if (drift) {
          if (existing.active) {
            try { await stripe.prices.update(priceId, { active: false }, { stripeAccount }); } catch (_) {}
          }
          priceId = null;
        }
      } catch (_) {
        priceId = null;
      }
    }
    if (!priceId) {
      const price = await stripe.prices.create({
        product:    productId,
        unit_amount: unitAmount,
        currency,
        recurring:  { interval },
        metadata:   { tradevoice_plan_id: plan.id },
      }, { stripeAccount });
      priceId = price.id;
    }

    // Persist IDs back so subsequent enrollments skip the Stripe round-trips.
    if (productId !== plan.stripe_product_id || priceId !== plan.stripe_price_id) {
      await supabase
        .from('plans')
        .update({ stripe_product_id: productId, stripe_price_id: priceId })
        .eq('id', planId);
    }

    // ── Insert pending plan_subscriptions row ──────────────────────────────
    // We insert BEFORE creating the Checkout Session so the
    // stripe_checkout_session_id is the only column we patch on the row
    // afterwards — keeps the webhook's link-by-session-id flow simple.
    const today = new Date().toISOString().split('T')[0];
    const { data: pending, error: insErr } = await supabase
      .from('plan_subscriptions')
      .insert({
        owner_id:         ownerId,
        plan_id:          planId,
        client_id:        clientId || null,
        billing_amount:   Number(plan.billing_amount),
        billing_interval: interval,
        billing_currency: currency,
        status:           'incomplete',
        started_at:       today,
        pending_email:    clientEmail,
        pending_name:     clientName,
      })
      .select()
      .single();
    if (insErr) {
      console.error('[plan-checkout] insert pending row failed:', insErr);
      return res.status(500).json({ error: 'pending_row_insert_failed', detail: insErr.message });
    }

    // ── Create Checkout Session on the connected account ───────────────────
    const origin = publicAppUrl(req);
    const back   = returnUrl || `${origin}/?tab=plans`;
    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      line_items:           [{ price: priceId, quantity: 1 }],
      customer_email:       clientEmail || undefined,
      success_url:          `${back}${back.includes('?') ? '&' : '?'}enroll=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${back}${back.includes('?') ? '&' : '?'}enroll=cancel`,
      subscription_data: {
        metadata: {
          tradevoice_plan_id:         planId,
          tradevoice_owner_id:        ownerId,
          tradevoice_plan_sub_row_id: pending.id,
        },
      },
      metadata: {
        tradevoice_plan_id:         planId,
        tradevoice_owner_id:        ownerId,
        tradevoice_plan_sub_row_id: pending.id,
      },
    }, { stripeAccount });

    // Stash the session id on the pending row so the webhook can find it.
    const { error: linkErr } = await supabase
      .from('plan_subscriptions')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', pending.id);
    if (linkErr) {
      console.error('[plan-checkout] could not stash session id:', linkErr);
      // Not fatal — the webhook can still fall back to subscription metadata.
    }

    return res.status(200).json({
      checkoutUrl:     session.url,
      sessionId:       session.id,
      pendingSubId:    pending.id,
      stripePriceId:   priceId,
      stripeProductId: productId,
    });
  } catch (e) {
    console.error('[plan-checkout] failed:', e);
    return res.status(500).json({ error: 'stripe_error', detail: e?.message });
  }
}

function publicAppUrl(req) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
