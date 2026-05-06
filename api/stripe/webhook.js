// POST /api/stripe/webhook
//
// Receives Stripe events. The four we care about:
//   - payment_intent.succeeded         → mark the invoice paid
//   - payment_intent.payment_failed    → log the failure (no status change)
//   - account.updated                  → keep stripe_account_charges_enabled fresh
//   - account.application.deauthorized → clear the connected account ID
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

  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return res.status(400).json({ error: 'missing_signature_or_secret' });
  }

  let event;
  try {
    const buf = await rawBody(req);
    event = stripe.webhooks.constructEvent(buf, sig, secret);
  } catch (e) {
    console.error('[stripe webhook] signature verification failed:', e?.message);
    return res.status(400).json({ error: 'invalid_signature' });
  }

  const supabase = getServiceClient();

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
