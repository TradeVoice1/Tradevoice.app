// POST /api/stripe/create-payment-intent
// Body: { shareToken: <invoice share_token>, amount?: <override in dollars> }
//
// Public endpoint called by the customer-facing /i/<token> page. Creates a
// Stripe PaymentIntent on the contractor's connected account so the money
// flows directly to their bank, then returns the client secret so the
// browser can confirm the payment with Stripe Elements.
//
// Trust model: the share token is the auth — if you have it, you can pay
// the invoice. We re-fetch invoice + contractor every time (no client-
// supplied amount unless the caller is adding a tip / partial payment in
// a future feature) so the customer can't tamper with the price.

import { getServiceClient } from "../_lib/supabase.js";
import { stripe, platformFeeCents } from "../_lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { shareToken } = req.body || {};
  if (!shareToken) return res.status(400).json({ error: 'missing_share_token' });

  const supabase = getServiceClient();

  // Pull the invoice + contractor's connected account via the security-
  // definer RPC added in migration 0013. Anonymous-friendly by design.
  const { data, error } = await supabase.rpc('get_public_invoice_for_payment', { p_token: shareToken });
  if (error) {
    console.error('[stripe pi] rpc failed:', error);
    return res.status(500).json({ error: 'lookup_failed' });
  }
  if (!data) return res.status(404).json({ error: 'invoice_not_found' });

  if (!data.stripe_account_id || !data.stripe_charges_enabled) {
    return res.status(400).json({ error: 'contractor_stripe_not_ready' });
  }
  if (data.status === 'paid' || data.status === 'void') {
    return res.status(400).json({ error: 'invoice_not_payable', status: data.status });
  }

  // Compute the total from server-side state. Mirrors the front-end's
  // calcInvoice but kept simple here — we only need the dollar total to
  // bill, not the full breakdown.
  const subtotal = sumLines(data.labor) + sumLines(data.materials) + sumLines(data.equipment);
  const markup   = subtotal * (Number(data.markup || 0) / 100);
  const taxable  = subtotal + markup;
  const tax      = taxable * (Number(data.tax || 0) / 100);
  const totalDollars = round2(subtotal + markup + tax);

  // Subtract anything already paid (partial payments, refunds, etc.).
  const alreadyPaid = (data.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDollars = round2(Math.max(0, totalDollars - alreadyPaid));
  if (balanceDollars <= 0) {
    return res.status(400).json({ error: 'invoice_already_settled' });
  }

  const amountCents = Math.round(balanceDollars * 100);

  try {
    const intent = await stripe.paymentIntents.create({
      amount:               amountCents,
      currency:             'usd',
      application_fee_amount: platformFeeCents(balanceDollars),
      automatic_payment_methods: { enabled: true },
      description:          `Invoice ${data.number} — ${data.title || data.contractor_company || ''}`.trim(),
      receipt_email:        data.client_email || undefined,
      metadata: {
        tradevoice_invoice_id: data.invoice_id,
        tradevoice_owner_id:   data.owner_id,
        invoice_number:        data.number,
      },
      transfer_data: { destination: data.stripe_account_id },
    });
    return res.status(200).json({
      clientSecret: intent.client_secret,
      amount:       balanceDollars,
      publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (e) {
    console.error('[stripe pi] create failed:', e);
    return res.status(500).json({ error: 'stripe_error', detail: e?.message });
  }
}

function sumLines(rows) {
  if (!Array.isArray(rows)) return 0;
  let total = 0;
  for (const r of rows) {
    // Labor rows have hrs * rate; mat rows have qty * cost; equip rows have days * rate
    const a = Number(r.hrs ?? r.qty  ?? r.days ?? 0);
    const b = Number(r.rate ?? r.cost ?? 0);
    total += a * b;
  }
  return total;
}
function round2(n) { return Math.round(n * 100) / 100; }
