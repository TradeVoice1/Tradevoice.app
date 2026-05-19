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

  // Find the user that owns this state nonce. We walk every page of users
  // looking for the one whose app_metadata.stripe_oauth_state matches.
  //
  // Why paginate: supabase.auth.admin.listUsers() defaults to 50 users per
  // page (max 1000). With a single un-paginated call, the very first
  // contractor who connects Stripe AFTER user #50 would silently fail
  // with `state_mismatch` because their record isn't in the returned
  // window — even though everything else is fine. Walking pages until
  // we either find them or exhaust the list keeps this O(N/1000) safe
  // and correct regardless of total user count.
  //
  // Long-term fix: stash the state nonce on a dedicated short-TTL table
  // (or profiles column with index) and look up by state in O(1).
  // Doing that requires a migration; keeping the paginated walk for now
  // since it works for our private-preview scale.
  let matchedUser = null;
  let page = 1;
  const PAGE_SIZE = 1000;            // Supabase admin API cap
  // Cap pages so a bug elsewhere can't run away. 50k users is well past beta.
  const MAX_PAGES = 50;
  while (page <= MAX_PAGES) {
    const { data, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (listErr) {
      console.error('[stripe callback] could not list users (page', page + '):', listErr);
      return res.redirect(302, `${baseUrl}/?stripe=error&msg=lookup_failed`);
    }
    const pageUsers = data?.users || [];
    const hit = pageUsers.find(u => u.app_metadata?.stripe_oauth_state === state);
    if (hit) { matchedUser = hit; break; }
    if (pageUsers.length < PAGE_SIZE) break;  // exhausted
    page++;
  }
  if (!matchedUser) {
    console.warn('[stripe callback] state nonce not found across', page, 'page(s) — possible replay or expired link');
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
