// Verify the caller of a /api/super-owner/* endpoint is the founder.
//
// All super-owner endpoints share the same gate:
//   1. Extract the user's access token from the Authorization header
//   2. Validate it with the service-role Supabase client (this is just
//      JWT verification — no DB roundtrip on the auth side)
//   3. Look up the resulting user's profile and check is_super_owner
//
// On failure, the endpoint should respond 401 / 403 and reveal nothing
// about whether the token was bad vs. the user just isn't the founder.
// "Insufficient privileges" is enough.

import { getServiceClient } from "./supabase.js";

export async function requireSuperOwner(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return { ok: false, status: 401, error: 'missing_token' };
  const accessToken = m[1].trim();

  const supabase = getServiceClient();
  // getUser(jwt) validates the token's signature and expiry without
  // contacting the user-side endpoint. Cheap, deterministic, safe.
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: 'invalid_token' };
  }
  const userId = userData.user.id;

  // Single profile lookup confirms the caller is THE super-owner.
  // is_super_owner has a unique partial index so at most one row can
  // be true at a time; a stolen token from a non-super account just
  // gets this query returning is_super_owner = false.
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, is_super_owner, super_owner_totp_secret, super_owner_unlock_at')
    .eq('id', userId)
    .maybeSingle();
  if (profErr) {
    return { ok: false, status: 500, error: 'profile_lookup_failed' };
  }
  if (!profile?.is_super_owner) {
    return { ok: false, status: 403, error: 'insufficient_privileges' };
  }

  return { ok: true, userId, email: userData.user.email, profile, supabase };
}
