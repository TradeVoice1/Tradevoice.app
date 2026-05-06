// GET /api/stripe/callback?code=...&state=...
//
// Stripe redirects the contractor here after they finish the Connect OAuth
// flow. We:
//   1. Verify the `state` matches the nonce we stashed in connect-start
//      (against any user — we look it up by state, not by user id, since
//      the browser session may have changed)
//   2. Exchange the auth code for the connected account ID
//   3. Save acct_... onto the user's profile
//   4. Fetch the account once to set charges_enabled correctly
//   5. Redirect the browser back into the app with a success/error flag
//
// The user lands on the Settings → Payment Setup page either way.

import { getServiceClient } from "../_lib/supabase.js";
import { stripe } from "../_lib/stripe.js";

export default async function handler(req, res) {
  const { code, state, error: oauthError, error_description } = req.query || {};
  const supabase = getServiceClient();
  const baseUrl  = publicAppUrl(req);

  // User declined / Stripe returned an error — bounce back with a message.
  if (oauthError) {
    return res.redirect(302, `${baseUrl}/?stripe=error&msg=${encodeURIComponent(error_description || oauthError)}`);
  }
  if (!code || !state) {
    return res.redirect(302, `${baseUrl}/?stripe=error&msg=missing_params`);
  }

  // Find the user that owns this state nonce. Listing all users is fine at
  // current scale; we'd switch to a dedicated state table once we cross
  // a few thousand contractors.
  const { data: { users } = { users: [] }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('[stripe callback] could not list users:', listErr);
    return res.redirect(302, `${baseUrl}/?stripe=error&msg=lookup_failed`);
  }
  const matchedUser = users.find(u => u.app_metadata?.stripe_oauth_state === state);
  if (!matchedUser) {
    return res.redirect(302, `${baseUrl}/?stripe=error&msg=state_mismatch`);
  }
  const returnUrl = matchedUser.app_metadata?.stripe_oauth_return || null;

  // Exchange code → connected account ID.
  let connectedAccountId, chargesEnabled = false;
  try {
    const resp = await stripe.oauth.token({ grant_type: 'authorization_code', code });
    connectedAccountId = resp.stripe_user_id;
    // Fetch the account so we can set charges_enabled accurately on first save.
    const acct = await stripe.accounts.retrieve(connectedAccountId);
    chargesEnabled = !!acct.charges_enabled;
  } catch (e) {
    console.error('[stripe callback] OAuth token exchange failed:', e);
    return res.redirect(302, `${baseUrl}/?stripe=error&msg=oauth_exchange_failed`);
  }

  // Save the connected account on the profile + clear the OAuth state.
  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      stripe_account_id: connectedAccountId,
      stripe_account_charges_enabled: chargesEnabled,
    })
    .eq('id', matchedUser.id);
  if (updErr) {
    console.error('[stripe callback] could not save account id:', updErr);
    return res.redirect(302, `${baseUrl}/?stripe=error&msg=save_failed`);
  }
  // Clear the one-time state so it can't be replayed.
  await supabase.auth.admin.updateUserById(matchedUser.id, {
    app_metadata: { stripe_oauth_state: null, stripe_oauth_return: null },
  }).catch(() => {});

  return res.redirect(302, `${returnUrl || baseUrl}/?stripe=connected`);
}

function publicAppUrl(req) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
