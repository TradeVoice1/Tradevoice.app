// Founder TOTP gate — Phase 2 of the god-view security stack.
//
// Two modes, decided by whether the founder profile has
// super_owner_totp_secret set:
//
//   • SETUP (one-time): renders the QR code + the raw base32 secret
//     so the user can pair Google Authenticator / 1Password / Authy
//     either by scanning or by typing. After they enter a code that
//     verifies, the unlock_at gets stamped and they're in.
//
//   • UNLOCK (every 30 min idle): a single 6-digit input. Submitting
//     a valid code stamps unlock_at and shows the dashboard.
//
// This component is rendered by App.jsx only when the calling user
// is the super-owner. RegularSubscribers never see it.

import React, { useEffect, useRef, useState } from "react";
import { setupTotp, unlockTotp } from "./data/superOwnerTotp";

const C = {
  bg:        '#0f172a',         // deep slate — distinct from the normal app
  surface:   '#1e293b',
  border:    '#334155',
  text:      '#f1f5f9',
  muted:     '#94a3b8',
  dim:       '#64748b',
  green:     '#22c55e',
  greenDark: '#16a34a',
  red:       '#ef4444',
  redBg:     '#7f1d1d',
};

export default function TotpScreen({ user, mode = 'unlock', onUnlocked, onSignOut }) {
  // mode = 'setup' | 'unlock' — App.jsx decides based on profile state.

  // Setup-mode state — populated by the first setupTotp() call.
  const [setupData, setSetupData] = useState(null); // { secret, otpauthUrl, qrDataUrl }
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupErr, setSetupErr] = useState('');

  // Code-entry state — shared by both modes.
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const codeRef = useRef(null);

  // On mount: in setup mode, kick off the secret generation
  // immediately so the QR appears right away. In unlock mode the
  // user just types the code from their app — no server call needed
  // until they submit.
  useEffect(() => {
    if (mode === 'setup' && !setupData && !setupLoading) {
      setSetupLoading(true);
      setSetupErr('');
      setupTotp()
        .then(data => setSetupData(data))
        .catch(e => setSetupErr(e?.message || 'Could not generate a TOTP secret.'))
        .finally(() => setSetupLoading(false));
    }
    // Focus the code input so the user can start typing immediately.
    if (codeRef.current) codeRef.current.focus();
  }, [mode]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setErr('');
    if (!/^\d{6}$/.test(code.trim())) {
      setErr('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    try {
      const result = await unlockTotp(code.trim());
      onUnlocked?.(result.unlockedAt);
    } catch (e) {
      if (e.code === 'invalid_code') {
        setErr('That code didn\'t match. Try the current code from your app.');
      } else if (e.code === 'totp_not_enrolled') {
        setErr('No TOTP secret is set yet — refresh the page to start setup.');
      } else {
        setErr(e?.message || 'Could not verify the code.');
      }
      setCode('');
      if (codeRef.current) codeRef.current.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: C.bg, color: C.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 32,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
            Founder Access
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>
            {mode === 'setup' ? 'Set up two-factor authentication' : 'Verify your identity'}
          </div>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 6, lineHeight: 1.55 }}>
            {mode === 'setup'
              ? 'One-time setup. Scan the QR code with Google Authenticator, 1Password, or Authy. Then enter the 6-digit code your app shows to confirm.'
              : 'Enter the current 6-digit code from your authenticator app. The session stays unlocked for 30 minutes of activity.'}
          </div>
        </div>

        {/* Setup-mode QR + secret */}
        {mode === 'setup' && (
          <div style={{ marginBottom: 22 }}>
            {setupLoading && (
              <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 15 }}>
                Generating secret…
              </div>
            )}
            {setupErr && (
              <div style={{ background: C.redBg, color: '#fecaca', padding: 12, borderRadius: 8, fontSize: 15, marginBottom: 12 }}>
                {setupErr}
              </div>
            )}
            {setupData && (
              <>
                <div style={{
                  background: '#fff', borderRadius: 12,
                  padding: 14, display: 'flex', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <img src={setupData.qrDataUrl} alt="TOTP QR" style={{ width: 220, height: 220, display: 'block' }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                  Or enter manually
                </div>
                <div style={{
                  background: '#0b1220', border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '12px 14px',
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  fontSize: 16, color: C.text, letterSpacing: '0.1em',
                  wordBreak: 'break-all',
                }}>
                  {setupData.secret.replace(/(.{4})/g, '$1 ').trim()}
                </div>
                <div style={{ fontSize: 14, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
                  Store this secret somewhere safe before continuing — if you lose your phone, you'll need it (or the recovery flow) to re-pair.
                </div>
              </>
            )}
          </div>
        )}

        {/* Code entry — same form in both modes */}
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
            6-digit code
          </label>
          <input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={busy || (mode === 'setup' && !setupData)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '16px 18px', fontSize: 30, fontWeight: 700,
              letterSpacing: '0.5em', textAlign: 'center',
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              background: '#0b1220',
              border: `1.5px solid ${err ? C.red : C.border}`,
              borderRadius: 10, color: C.text, outline: 'none',
            }}
          />
          {err && (
            <div style={{ fontSize: 15, color: '#fca5a5', marginTop: 8 }}>{err}</div>
          )}

          <button
            type="submit"
            disabled={busy || code.length !== 6 || (mode === 'setup' && !setupData)}
            style={{
              width: '100%', marginTop: 16,
              padding: '14px 20px', borderRadius: 10,
              background: code.length === 6 && !busy ? C.green : '#1e293b',
              border: 'none', color: '#fff',
              fontSize: 17, fontWeight: 800, letterSpacing: '0.02em',
              cursor: busy || code.length !== 6 ? 'wait' : 'pointer',
              opacity: code.length === 6 && !busy ? 1 : 0.5,
              fontFamily: 'inherit',
            }}
          >
            {busy ? 'Verifying…' : mode === 'setup' ? 'Confirm & Unlock' : 'Unlock Dashboard'}
          </button>
        </form>

        {/* Sign-out escape hatch — if the founder is locked out and
            wants to go back to a different account. */}
        <button
          onClick={onSignOut}
          style={{
            display: 'block', margin: '20px auto 0', padding: '8px 14px',
            background: 'transparent', border: 'none', color: C.dim,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          Sign out
        </button>

        {/* Account context — small reminder at the bottom of who's
            authenticating (helps when the founder has multiple
            authenticator entries for different apps). */}
        <div style={{ fontSize: 13, color: C.dim, textAlign: 'center', marginTop: 14, letterSpacing: '0.04em' }}>
          {user?.email}
        </div>
      </div>
    </div>
  );
}
