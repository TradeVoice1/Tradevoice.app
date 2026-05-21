// Front-end calls into /api/super-owner/* — the TOTP setup + unlock
// endpoints that gate the founder dashboard.

import { supabase } from "../supabase";

// Helper — every super-owner endpoint requires the user's current
// Supabase access token in the Authorization header. We pull it from
// the live session each call (rather than caching) so token rotation
// during a long-lived tab doesn't 401 us.
async function authHeader() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${token}` };
}

// Generate (or rotate) the founder TOTP secret. Returns the secret,
// the otpauth URL, and a PNG data URL of the QR code so the setup
// screen can render <img src={qrDataUrl} /> without bundling a
// browser-side QR library.
export async function setupTotp() {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch('/api/super-owner/setup-totp', { method: 'POST', headers });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(j?.error || `Setup failed (HTTP ${res.status}).`);
  }
  return j; // { ok, secret, otpauthUrl, qrDataUrl }
}

// Verify a 6-digit code. On success, the server stamps
// super_owner_unlock_at = now() and returns the timestamp + the
// session window length in minutes.
export async function unlockTotp(code) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch('/api/super-owner/unlock', {
    method:  'POST',
    headers,
    body:    JSON.stringify({ code: String(code || '').trim() }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(j?.error || `Unlock failed (HTTP ${res.status}).`);
    err.code = j?.error;
    throw err;
  }
  return j; // { ok, unlockedAt, sessionMinutes }
}

// Check the local session is still warm. Returns true when the user
// passed TOTP within the last `sessionMinutes` minutes. The
// authoritative check is server-side (every privileged action re-
// verifies via requireSuperOwner), but the front-end uses this to
// decide whether to render the unlock prompt or the dashboard.
export function isUnlockValid(unlockedAtIso, sessionMinutes = 30) {
  if (!unlockedAtIso) return false;
  const at = new Date(unlockedAtIso).getTime();
  if (Number.isNaN(at)) return false;
  return (Date.now() - at) < (sessionMinutes * 60 * 1000);
}
