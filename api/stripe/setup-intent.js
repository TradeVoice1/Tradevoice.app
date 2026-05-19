// POST /api/stripe/setup-intent
// Body: { userId, email, name, plan }
//
// Creates a Stripe Customer for the contractor (or fetches an existing one),
// then creates a SetupIntent so the front-end can collect a payment method
// without charging yet. The SetupIntent's client_secret is returned to the
// browser and confirmed via Stripe Elements.
//
// We DON'T create the subscription here — that happens in
// /api/stripe/create-subscription after the front-end confirms the
// SetupIntent and we know the PM is good. Splitting the two keeps the
// flow recoverable: if the user bails between SetupIntent and
// subscription creation, they just don't get charged.

import { stripe } from "../_lib/stripe.js";
import { getServiceClient } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { userId, email, name } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'missing_user_id' });

  const supabase = getServiceClient();

  // Look up the profile so we can reuse an existing customer if there is one.
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('stripe_customer_id, name, company')
    .eq('id', userId)
    .maybeSingle();
  if (profErr) {
    console.error('[setup-intent] profile lookup failed:', profErr);
    return res.status(500).json({ error: 'profile_lookup_failed' });
  }

  let customerId = profile?.stripe_customer_id;

  try {
    if (!customerId) {
      // idempotencyKey scoped to this userId so parallel calls (e.g. user
      // double-tapped Continue, or React Strict Mode double-fired the
      // effect) reuse the same Stripe Customer instead of creating two.
      // Stripe returns the original response for 24h on a matching key.
      const customer = await stripe.customers.create({
        email: email || undefined,
        name:  name || profile?.name || profile?.company || undefined,
        metadata: { tradevoice_user_id: userId },
      }, {
        idempotencyKey: `tv-customer-${userId}`,
      });
      customerId = customer.id;
      // Persist immediately so subsequent requests (and the create-subscription
      // endpoint) reuse the customer without another Stripe round-trip.
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // we'll charge auto-renewals later
    });

    return res.status(200).json({
      clientSecret:    setupIntent.client_secret,
      customerId,
      publishableKey:  process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (e) {
    console.error('[setup-intent] failed:', e);
    return res.status(500).json({ error: 'stripe_error', detail: e?.message });
  }
}
