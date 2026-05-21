// POST /api/super-owner/unlock
// Authorization: Bearer <supabase access token>
// Body: { code: string }   ← 6-digit TOTP code from authenticator app
//
// Gate that lifts every 30 min of dashboard idle. On valid code,
// stamps super_owner_unlock_at = now() and returns the timestamp.
// The front-end stores the timestamp and re-prompts when it's been
// more than 30 minutes since the last successful unlock.
//
// Lockout / brute-force protection: we DON'T currently rate-limit
// here. The attack surface is tiny — only the super-owner-flagged
// account can even reach the verify step (requireSuperOwner gate),
// and a brute-force against a single 6-digit code with ±30s drift
// would take ~10^5 attempts to break a single window. That said,
// it's worth adding rate-limiting later (e.g. Upstash-Ratelimit
// keyed on the user_id + IP).

import { requireSuperOwner } from "../_lib/superOwnerAuth.js";
import { verifyTotp } from "../_lib/totp.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const gate = await requireSuperOwner(req);
  if (!gate.ok) {
    return res.status(gate.status).json({ error: gate.error });
  }

  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'missing_code' });
  }
  if (!gate.profile.super_owner_totp_secret) {
    // TOTP isn't enrolled yet — front-end should route to the setup
    // screen instead of the unlock screen.
    return res.status(409).json({ error: 'totp_not_enrolled' });
  }

  const valid = verifyTotp(gate.profile.super_owner_totp_secret, code);
  if (!valid) {
    return res.status(401).json({ error: 'invalid_code' });
  }

  const unlockedAt = new Date().toISOString();
  const { error: updErr } = await gate.supabase
    .from('profiles')
    .update({ super_owner_unlock_at: unlockedAt })
    .eq('id', gate.userId);
  if (updErr) {
    console.error('[super-owner/unlock] DB update failed:', updErr);
    return res.status(500).json({ error: 'db_update_failed' });
  }

  return res.status(200).json({
    ok: true,
    unlockedAt,
    // Convenience: tell the front-end how long the session is valid
    // for so it can set its local refresh timer without hardcoding.
    sessionMinutes: 30,
  });
}
