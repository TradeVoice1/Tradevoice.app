// Standard authentication gate for API endpoints that mutate per-user
// data. Before this helper, most endpoints (setup-intent, connect-start,
// disconnect, create-subscription, plan-checkout, etc.) trusted the
// `userId` field from the request BODY without verifying the caller
// was actually that user — meaning an attacker who knew an endpoint's
// shape could:
//   - Disconnect any contractor's Stripe Connect
//   - Create spurious Stripe customers under any user_id
//   - Spam marketing email to any contractor's client list
//   - Burn Claude API tokens parsing rate tables for any owner
// Service-role DB writes inside those endpoints bypass RLS, so the
// HTTP layer was the only line of defense. There was none.
//
// Now: every sensitive endpoint calls requireAuth(req) at the top,
// validates the supplied user/owner ID matches the authenticated JWT,
// and rejects mismatches with 403. Front-end callers send a Bearer
// access token (pulled from the current Supabase session) in the
// Authorization header.

import { getServiceClient } from "./supabase.js";

// Validate the request's Authorization header and return the
// authenticated user info. Returns { ok: false, status, error } on
// failure with a status code suitable for res.status(status).
//
// Optional `requireUserMatch`: if provided, also asserts the user_id
// from the body equals the JWT's user_id. Most endpoints pass the
// body's `userId` field here to close the IDOR loophole.
export async function requireAuth(req, { requireUserMatch = null } = {}) {
  const header = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) {
    return { ok: false, status: 401, error: 'missing_token' };
  }
  const accessToken = m[1].trim();

  const supabase = getServiceClient();
  // getUser(jwt) validates signature + expiry of the access token.
  // No DB roundtrip on the auth side; Supabase decodes the JWT
  // signature locally with the project's auth secret.
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'invalid_token' };
  }

  const userId = data.user.id;
  const email  = data.user.email || null;

  // Guard against IDOR — the body's claimed user ID must match the JWT.
  // Caller passes `requireUserMatch: req.body.userId` (or .ownerId)
  // to opt into this check. Passing null/undefined skips it for
  // endpoints that don't accept a user ID in the body.
  if (requireUserMatch != null && requireUserMatch !== '' && requireUserMatch !== userId) {
    return { ok: false, status: 403, error: 'user_mismatch' };
  }

  return { ok: true, userId, email, supabase };
}
