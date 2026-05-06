// POST /api/stripe/connect-start
// Body: { userId: <auth user id>, returnUrl: <url to redirect back to> }
//
// Generates a Stripe Connect OAuth URL the user can open to link (or create)
// their Stripe account. The `state` parameter is a one-time nonce stored
// against the user's profile so we can verify the callback isn't forged.
//
// In production we'd persist the nonce in a short-TTL table; for now we
// stash it on profiles.stripe_oauth_state and clear it on callback.

import { getServiceClient } from "../_lib/supabase.js";
import { randomUUID } from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { userId, returnUrl } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'missing_user_id' });

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'stripe_not_configured', detail: 'STRIPE_CONNECT_CLIENT_ID missing' });
  }

  const supabase = getServiceClient();
  const state = randomUUID();

  // Stash the state so the callback can verify it. We piggyback on the
  // profile row — separate stripe_oauth_state column we'll add in the
  // migration if we want stricter separation; for now reuse a transient
  // app-metadata pattern via supabase.auth.admin.updateUserById.
  const { error: setErr } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { stripe_oauth_state: state, stripe_oauth_return: returnUrl || null },
  });
  if (setErr) {
    console.error('[stripe connect-start] could not stash state:', setErr);
    return res.status(500).json({ error: 'could_not_persist_state' });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    scope:         'read_write',
    state,
    redirect_uri:  `${publicAppUrl(req)}/api/stripe/callback`,
    'stripe_user[business_type]': 'company',
  });
  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  return res.status(200).json({ url });
}

// Resolve the public origin (https://app.thetradevoice.com or http://localhost:5173)
// from the request, with prod env override available.
function publicAppUrl(req) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
