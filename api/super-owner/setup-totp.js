// POST /api/super-owner/setup-totp
// Authorization: Bearer <supabase access token>
// Body: (none)
//
// One-time TOTP enrollment for the founder account. Generates a new
// random 160-bit base32 secret, stores it on the profile, and returns:
//   - the raw secret (so the user can type it manually if QR fails)
//   - the otpauth:// URL (for QR scanning by Google Authenticator etc.)
//   - a PNG data URL of the QR (rendered server-side via `qrcode`)
//
// Once a secret is set, calling this endpoint AGAIN rotates it — that's
// the recovery path if the founder loses their phone. The old secret
// is overwritten; any previously-paired authenticator stops working
// instantly. The unlock_at timestamp is also cleared so the next
// dashboard access must re-prompt with the new secret.
//
// Security notes:
//   - Only the super-owner can call this (requireSuperOwner gate)
//   - We use service_role to write to profiles, which bypasses the
//     migration-0032 trigger (the trigger explicitly allows
//     service_role to write super_owner_totp_secret)
//   - The secret never leaves the response body — it's not logged

import QRCode from "qrcode";
import { requireSuperOwner } from "../_lib/superOwnerAuth.js";
import { generateSecret, otpauthUrl } from "../_lib/totp.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const gate = await requireSuperOwner(req);
  if (!gate.ok) {
    return res.status(gate.status).json({ error: gate.error });
  }

  try {
    const secret = generateSecret();
    const url    = otpauthUrl(secret, gate.email);
    const qrDataUrl = await QRCode.toDataURL(url, {
      // High error-correction so the QR still scans if the user's
      // screen has reflections or the authenticator's camera is
      // hand-held and slightly blurry.
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 240,
    });

    // Stamp the secret. Clear unlock_at so the next dashboard load
    // forces verification with the new secret. enabled_at marks
    // when this pairing was set so we can show "Last enrolled: …"
    // in the UI later.
    const { error: updErr } = await gate.supabase
      .from('profiles')
      .update({
        super_owner_totp_secret:     secret,
        super_owner_totp_enabled_at: new Date().toISOString(),
        super_owner_unlock_at:       null,
      })
      .eq('id', gate.userId);
    if (updErr) {
      console.error('[super-owner/setup-totp] DB update failed:', updErr);
      return res.status(500).json({ error: 'db_update_failed' });
    }

    return res.status(200).json({
      ok:        true,
      secret,
      otpauthUrl: url,
      qrDataUrl,
    });
  } catch (e) {
    console.error('[super-owner/setup-totp] failed:', e);
    return res.status(500).json({ error: 'unexpected', detail: e?.message });
  }
}
