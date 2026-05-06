// POST /api/stripe/disconnect
// Body: { userId }
//
// Severs the OAuth link with the connected account and clears the stored
// account ID. Stripe charges already in-flight aren't affected; future
// PaymentIntents simply can't be created until reconnection.

import { getServiceClient } from "../_lib/supabase.js";
import { stripe } from "../_lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'missing_user_id' });

  const supabase = getServiceClient();
  const { data: profile, error: getErr } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .maybeSingle();
  if (getErr) {
    console.error('[stripe disconnect] profile lookup failed:', getErr);
    return res.status(500).json({ error: 'profile_lookup_failed' });
  }
  if (!profile?.stripe_account_id) {
    return res.status(200).json({ ok: true, alreadyDisconnected: true });
  }

  // Best-effort: ask Stripe to deauthorize. If Stripe says "already
  // disconnected" or the account doesn't exist, we still clear our row
  // so the UI reflects reality.
  try {
    await stripe.oauth.deauthorize({
      client_id:        process.env.STRIPE_CONNECT_CLIENT_ID,
      stripe_user_id:   profile.stripe_account_id,
    });
  } catch (e) {
    console.warn('[stripe disconnect] deauthorize failed (clearing locally anyway):', e?.message);
  }

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ stripe_account_id: null, stripe_account_charges_enabled: false })
    .eq('id', userId);
  if (updErr) {
    console.error('[stripe disconnect] could not clear profile:', updErr);
    return res.status(500).json({ error: 'profile_update_failed' });
  }
  return res.status(200).json({ ok: true });
}
