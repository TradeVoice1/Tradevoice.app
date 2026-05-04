import React, { useState } from "react";

// ─── FORGOT PASSWORD SCREEN ─────────────────────────────────────────────────
// Drop this component into App.jsx
// Usage: add 'forgot' as an authScreen state option
// In LoginScreen, wire the "Forgot password?" link to setAuthScreen('forgot')

export function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.thetradevoice.com/reset-password',
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const s = {
    wrap: { minHeight: '100vh', background: '#f7f7f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: '24px' },
    card: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '40px 36px', width: '100%', maxWidth: 420 },
    logo: { textAlign: 'center', marginBottom: 28 },
    h1: { fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 8, textAlign: 'center' },
    sub: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', marginBottom: 16 },
    btn: { width: '100%', padding: '14px', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '.04em' },
    btnDisabled: { width: '100%', padding: '14px', background: '#a0c4b4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'not-allowed', letterSpacing: '.04em' },
    error: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#b91c1c', marginBottom: 16 },
    success: { background: '#f0f7f4', border: '1px solid #a7d9be', borderRadius: 8, padding: '20px', textAlign: 'center' },
    successIcon: { fontSize: 32, marginBottom: 8 },
    successTitle: { fontSize: 16, fontWeight: 700, color: '#2d6a4f', marginBottom: 6 },
    successText: { fontSize: 14, color: '#555', lineHeight: 1.6 },
    backLink: { display: 'block', textAlign: 'center', marginTop: 20, fontSize: 14, color: '#2d6a4f', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none' },
  };

  if (status === 'sent') {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <div style={s.logo}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#1b4332', letterSpacing: '.1em' }}>TRADEVOICE</span>
          </div>
          <div style={s.success}>
            <div style={s.successIcon}>✉️</div>
            <div style={s.successTitle}>Check your email</div>
            <div style={s.successText}>
              We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link to reset your password.
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            Didn't receive it? Check your spam folder or{' '}
            <span style={{ color: '#2d6a4f', cursor: 'pointer', fontWeight: 600 }} onClick={() => setStatus('idle')}>try again</span>.
          </div>
          <button style={s.backLink} onClick={onBack}>← Back to Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#1b4332', letterSpacing: '.1em' }}>TRADEVOICE</span>
        </div>
        <div style={s.h1}>Forgot your password?</div>
        <div style={s.sub}>Enter your email address and we'll send you a link to reset your password.</div>

        {status === 'error' && (
          <div style={s.error}>{errorMsg}</div>
        )}

        <label style={s.label}>Email Address</label>
        <input
          style={s.input}
          type="email"
          placeholder="matt@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={status === 'loading'}
        />

        <button
          style={status === 'loading' ? s.btnDisabled : s.btn}
          onClick={handleSubmit}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
        </button>

        <button style={s.backLink} onClick={onBack}>← Back to Sign In</button>
      </div>
    </div>
  );
}

// ─── RESET PASSWORD SCREEN ───────────────────────────────────────────────────
// This screen handles the link from the email
// Show this when authScreen === 'reset' (Supabase redirects back with a token)

export function ResetPasswordScreen({ onBack }) {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleReset = async () => {
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      setStatus('error');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const s = {
    wrap: { minHeight: '100vh', background: '#f7f7f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: '24px' },
    card: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '40px 36px', width: '100%', maxWidth: 420 },
    logo: { textAlign: 'center', marginBottom: 28 },
    h1: { fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 8, textAlign: 'center' },
    sub: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', marginBottom: 16 },
    btn: { width: '100%', padding: '14px', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '.04em' },
    btnDisabled: { width: '100%', padding: '14px', background: '#a0c4b4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'not-allowed', letterSpacing: '.04em' },
    error: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#b91c1c', marginBottom: 16 },
    success: { background: '#f0f7f4', border: '1px solid #a7d9be', borderRadius: 8, padding: '20px', textAlign: 'center' },
    successTitle: { fontSize: 16, fontWeight: 700, color: '#2d6a4f', marginBottom: 6 },
    successText: { fontSize: 14, color: '#555', lineHeight: 1.6 },
    backLink: { display: 'block', textAlign: 'center', marginTop: 20, fontSize: 14, color: '#2d6a4f', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none' },
  };

  if (status === 'done') {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <div style={s.logo}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#1b4332', letterSpacing: '.1em' }}>TRADEVOICE</span>
          </div>
          <div style={s.success}>
            <div style={s.successTitle}>Password updated!</div>
            <div style={s.successText}>Your password has been reset successfully. You can now sign in with your new password.</div>
          </div>
          <button style={s.backLink} onClick={onBack}>Sign In →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#1b4332', letterSpacing: '.1em' }}>TRADEVOICE</span>
        </div>
        <div style={s.h1}>Set new password</div>
        <div style={s.sub}>Choose a strong password for your TradeVoice account.</div>

        {status === 'error' && (
          <div style={s.error}>{errorMsg}</div>
        )}

        <label style={s.label}>New Password</label>
        <input
          style={s.input}
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={status === 'loading'}
        />

        <label style={s.label}>Confirm Password</label>
        <input
          style={s.input}
          type="password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReset()}
          disabled={status === 'loading'}
        />

        <button
          style={status === 'loading' ? s.btnDisabled : s.btn}
          onClick={handleReset}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Updating...' : 'Update Password'}
        </button>

        <button style={s.backLink} onClick={onBack}>← Back to Sign In</button>
      </div>
    </div>
  );
}
