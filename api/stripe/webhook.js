// POST /api/stripe/webhook
//
// Receives Stripe events from two "directions":
//
//   1. PLATFORM events (no event.account) — Tradevoice's own Stripe account
//      events. These cover the contractor's subscription to Tradevoice
//      itself (migration 0015) and account-level events from Connect OAuth.
//
//   2. CONNECT events (event.account = acct_...) — fired on behalf of each
//      contractor's connected Stripe account. These cover invoice payments
//      to the contractor (migration 0013) AND, as of Phase 2 of service
//      contracts (migration 0018), recurring subscription billing the
//      contractor charges their customers.
//
// Both flow through the SAME webhook endpoint URL. In Stripe's older v1
// webhook UI you could set up one destination with a "listen on Connected
// accounts too" checkbox. The new Workbench v2 UI splits these into TWO
// separate destinations (one per scope) — same URL, different signing
// secrets. We accept both signing secrets via env vars and try each in
// turn when verifying the incoming signature.
//   STRIPE_WEBHOOK_SECRET_PLATFORM — Your account scope destination
//   STRIPE_WEBHOOK_SECRET_CONNECT  — Connected accounts scope destination
//   STRIPE_WEBHOOK_SECRET          — legacy single-secret fallback (kept
//                                    for backward compat; safe to remove
//                                    once the new two-secret env is set)
// Then branch inside the handler on event.account presence to route each
// event to the right RPC.
//
// IMPORTANT: Vercel serverless functions parse JSON by default, but Stripe
// signature verification needs the RAW body. Disable parsing via the config
// export below and read the body as a stream.

import { stripe } from "../_lib/stripe.js";
import { getServiceClient } from "../_lib/supabase.js";

export const config = {
  api: { bodyParser: false },
};

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'missing_signature' });
  }

  // Try each configured secret in turn — Stripe's Workbench v2 UI splits
  // platform-scope and connect-scope into two destinations with their own
  // signing secrets, so the same code path has to verify against either.
  // filter(Boolean) drops any env var that wasn't set; the legacy single
  // STRIPE_WEBHOOK_SECRET is included last so older setups still work.
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET_PLATFORM,
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT,
    process.env.STRIPE_WEBHOOK_SECRET,
  ].filter(Boolean);
  if (secrets.length === 0) {
    return res.status(400).json({ error: 'no_webhook_secrets_configured' });
  }

  const buf = await rawBody(req);
  let event = null;
  let lastError = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(buf, sig, secret);
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!event) {
    console.error('[stripe webhook] signature verification failed against all configured secrets:', lastError?.message);
    return res.status(400).json({ error: 'invalid_signature' });
  }

  const supabase = getServiceClient();
  // Branching signal: presence of event.account means Stripe fired this on
  // behalf of a connected account (a contractor). Absence means it's a
  // platform-level event on Tradevoice's own account.
  const isConnectEvent = !!event.account;

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const invoiceId = intent.metadata?.tradevoice_invoice_id;
        const charge    = intent.latest_charge;
        if (!invoiceId) {
          console.warn('[stripe webhook] payment_intent.succeeded with no invoice metadata');
          break;
        }
        const { data, error } = await supabase.rpc('mark_invoice_paid_via_stripe', {
          p_invoice_id:     invoiceId,
          p_amount:         intent.amount_received / 100,
          p_payment_intent: intent.id,
          p_charge_id:      typeof charge === 'string' ? charge : (charge?.id || null),
        });
        if (error) console.error('[stripe webhook] mark_invoice_paid_via_stripe failed:', error);
        else       console.log('[stripe webhook] invoice paid:', invoiceId, data);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        console.warn('[stripe webhook] payment_intent.payment_failed:', intent.id, intent.last_payment_error?.message);
        // Could write an activity log entry; for now just observe.
        break;
      }
      case 'account.updated': {
        const acct = event.data.object;
        const { error } = await supabase
          .from('profiles')
          .update({ stripe_account_charges_enabled: !!acct.charges_enabled })
          .eq('stripe_account_id', acct.id);
        if (error) console.error('[stripe webhook] account.updated profile sync failed:', error);
        break;
      }
      case 'account.application.deauthorized': {
        // The contractor revoked Tradevoice's access from their Stripe
        // dashboard. Treat the same as our own /api/stripe/disconnect.
        const acctId = event.account || event.data?.object?.id;
        if (acctId) {
          await supabase
            .from('profiles')
            .update({ stripe_account_id: null, stripe_account_charges_enabled: false })
            .eq('stripe_account_id', acctId);
        }
        break;
      }

      // ── Subscription events ──────────────────────────────────────────────
      // Branch by event.account:
      //   - Platform events  → contractor's subscription TO TRADEVOICE
      //                        (migration 0015 — profiles.subscription_status)
      //   - Connect events   → contractor's customer's subscription to a
      //                        SERVICE CONTRACT (migration 0018 —
      //                        plan_subscriptions.status)
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (isConnectEvent) {
          // Service contract sub. Use the dedicated RPC.
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          const canceledAt = event.type === 'customer.subscription.deleted'
            ? new Date().toISOString()
            : (sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null);
          const effectiveStatus = event.type === 'customer.subscription.deleted'
            ? 'canceled'
            : sub.status;
          await supabase.rpc('update_plan_subscription_status', {
            p_subscription_id:    sub.id,
            p_status:             effectiveStatus,
            p_current_period_end: periodEnd,
            p_canceled_at:        canceledAt,
          });
          console.log('[stripe webhook] (connect) plan sub', event.type, sub.id, sub.status);
        } else {
          // Platform subscription (Tradevoice's own customer).
          const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
          await supabase.rpc('update_subscription_status', {
            p_customer_id:     sub.customer,
            p_subscription_id: sub.id,
            p_status:          event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status,
            p_trial_ends_at:   trialEnd,
          });
          console.log('[stripe webhook] subscription', event.type, sub.customer, sub.status);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        if (isConnectEvent && inv.subscription) {
          // Service contract renewal failed — flip plan_subscriptions row to past_due.
          await supabase.rpc('update_plan_subscription_status', {
            p_subscription_id:    inv.subscription,
            p_status:             'past_due',
            p_current_period_end: null,
            p_canceled_at:        null,
          });
          console.warn('[stripe webhook] (connect) plan sub invoice failed:', inv.subscription, inv.id);
        } else if (inv.customer) {
          // Platform: contractor's subscription to Tradevoice is past due.
          await supabase.rpc('update_subscription_status', {
            p_customer_id:     inv.customer,
            p_subscription_id: inv.subscription || null,
            p_status:          'past_due',
            p_trial_ends_at:   null,
          });
          console.warn('[stripe webhook] subscription invoice payment failed:', inv.customer, inv.id);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object;
        if (isConnectEvent && inv.subscription) {
          // Service contract renewal succeeded — confirm active + advance period.
          const periodEnd = inv.lines?.data?.[0]?.period?.end
            ? new Date(inv.lines.data[0].period.end * 1000).toISOString()
            : null;
          await supabase.rpc('update_plan_subscription_status', {
            p_subscription_id:    inv.subscription,
            p_status:             'active',
            p_current_period_end: periodEnd,
            p_canceled_at:        null,
          });
        } else if (inv.customer && inv.subscription) {
          // Renewal succeeded on Tradevoice's own customer subscription.
          await supabase.rpc('update_subscription_status', {
            p_customer_id:     inv.customer,
            p_subscription_id: inv.subscription,
            p_status:          'active',
            p_trial_ends_at:   null,
          });
        }
        break;
      }

      // ── Service contract enrollment completed (migration 0018) ───────────
      // Customer just finished entering their card on the Stripe-hosted
      // Checkout page. Promote the pending plan_subscriptions row from
      // 'incomplete' to whatever Stripe says (usually 'active' or 'trialing').
      case 'checkout.session.completed': {
        if (!isConnectEvent) {
          // Platform-side checkout sessions aren't currently used; ignore.
          break;
        }
        const session = event.data.object;
        if (session.mode !== 'subscription' || !session.subscription) break;
        // Fetch the subscription on the connected account to get its
        // current_period_end (the session payload only has the subscription
        // id, not its period state).
        let periodEnd = null;
        let subStatus = 'active';
        try {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription,
            { stripeAccount: event.account }
          );
          periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          subStatus = sub.status || 'active';
        } catch (e) {
          console.warn('[stripe webhook] could not retrieve sub for session:', session.id, e?.message);
        }
        await supabase.rpc('link_plan_subscription_from_checkout', {
          p_session_id:         session.id,
          p_subscription_id:    session.subscription,
          p_customer_id:        session.customer || null,
          p_status:             subStatus,
          p_current_period_end: periodEnd,
        });
        console.log('[stripe webhook] (connect) checkout.session.completed linked', session.id, session.subscription);
        break;
      }
      default:
        // No-op for events we don't subscribe to. Log so we know if Stripe
        // ever sends something unexpected from the dashboard config.
        console.log('[stripe webhook] ignored event:', event.type);
    }
  } catch (e) {
    console.error('[stripe webhook] handler threw:', e);
    return res.status(500).json({ error: 'handler_failed' });
  }

  return res.status(200).json({ received: true });
}
