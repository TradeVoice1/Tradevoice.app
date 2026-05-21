// RFC 6238 TOTP implementation for the founder account 2FA gate.
//
// Why roll our own instead of using `otpauth` or `speakeasy`: TOTP is
// 30 lines and we only need two operations (generate secret + verify
// code). Adding a dependency for that surface area is unjustified —
// fewer deps = smaller attack surface for an admin-only feature
// that's the literal gate to "see every customer's data."
//
// All four sub-functions use only Node's built-in `crypto` module.

import crypto from "node:crypto";

// ── Base32 (RFC 4648, no padding) ─────────────────────────────────────────
// Used because that's what Google Authenticator / 1Password / Authy
// expect when you scan an otpauth:// URL. Their UI displays the
// secret in 4-char chunks, and we mirror that on the setup screen.
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += B32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

export function base32Decode(str) {
  const cleaned = String(str).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of cleaned) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ── Generate a new random secret (160 bits, recommended by RFC 6238) ───
// 20 random bytes = 32 base32 characters. Long enough that brute-force
// is infeasible; short enough to type by hand if the QR scan fails.
export function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

// ── Compute the TOTP code for a given secret + time window ─────────────
// step = 30 seconds per RFC default. digits = 6 per RFC default.
// Returns a string padded to `digits` (e.g. "042319").
export function totpAt(secret, timestamp = Date.now(), step = 30, digits = 6) {
  const counter = Math.floor(timestamp / 1000 / step);
  const key = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  // 8-byte big-endian counter — Node's writeBigUInt64BE handles the
  // full range past 2038. JS numbers stop being safe at 2^53 but the
  // counter won't hit that for ~285 million years.
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  // Dynamic truncation per RFC 4226 §5.3
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset]     & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) <<  8) |
    ( hmac[offset + 3] & 0xff);
  return String(code % (10 ** digits)).padStart(digits, '0');
}

// ── Verify a user-submitted code, allowing ±1 step of clock drift ─────
// Authenticator apps run on phones with NTP-synced clocks; servers
// run on cloud VMs with NTP-synced clocks. They're rarely off by more
// than a second, but a 30-second window means a code typed right at
// the boundary could fail. ±1 step is the RFC-recommended tolerance.
// Returns true if any of [now-1, now, now+1] matches the submitted code.
export function verifyTotp(secret, submittedCode, timestamp = Date.now()) {
  if (!secret || !submittedCode) return false;
  const code = String(submittedCode).replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  for (const drift of [-1, 0, 1]) {
    const t = timestamp + drift * 30 * 1000;
    if (totpAt(secret, t) === code) return true;
  }
  return false;
}

// ── Build the otpauth:// URL that an authenticator app's QR scanner
//    reads. Includes issuer + account label so the app shows
//    "Tradevoice (matthew@thetradevoice.com)" in its list.
export function otpauthUrl(secret, accountEmail) {
  const issuer = 'Tradevoice';
  const label  = `${issuer}:${accountEmail}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits:    '6',
    period:    '30',
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
