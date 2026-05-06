// Customer-facing inline Stripe payment panel. Mounted on the public
// /i/<share_token> invoice page when the contractor has Stripe Connect
// fully set up. Lifecycle:
//   1. User clicks "Pay $X.XX with Card"
//   2. We call POST /api/stripe/create-payment-intent with the share token
//   3. API creates a PaymentIntent on the contractor's connected account
//      and returns the client_secret + publishable key
//   4. We lazy-import @stripe/stripe-js, mount Stripe Elements
//   5. User submits → Stripe handles 3D Secure, ACH redirects, etc.
//   6. On success, the success view replaces the panel; the webhook
//      (api/stripe/webhook.js) marks the invoice paid in Postgres
//
// Lazy-imports Stripe.js so the rest of the public invoice render doesn't
// pay the JS-bundle cost when the user doesn't need to pay online.

import { useEffect, useRef, useState } from "react";

const fmtMoney = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function StripePayPanel({ shareToken, accentColor }) {
  const [phase,  setPhase]  = useState('idle');     // idle | loading | ready | submitting | success | error
  const [error,  setError]  = useState('');
  const [amount, setAmount] = useState(null);
  const stripeRef   = useRef(null);
  const elementsRef = useRef(null);
  const mountRef    = useRef(null);

  const accent = accentColor || '#2d6a4f';

  const startPayment = async () => {
    if (phase !== 'idle' && phase !== 'error') return;
    setPhase('loading');
    setError('');
    try {
      const r = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken }),
      });
      const j = await r.json();
      if (!r.ok) {
        // Translate the few errors the API surfaces into customer-friendly text.
        if (j.error === 'contractor_stripe_not_ready') {
          throw new Error("Online payments aren't set up for this contractor yet — see the payment options below.");
        }
        if (j.error === 'invoice_not_payable' || j.error === 'invoice_already_settled') {
          throw new Error('This invoice is already paid or closed.');
        }
        throw new Error(j.error || 'Could not start payment.');
      }
      setAmount(j.amount);

      // Lazy-load Stripe.js
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(j.publishableKey);
      if (!stripe) throw new Error('Stripe.js failed to initialize.');

      const elements = stripe.elements({
        clientSecret: j.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: accent,
            colorText: '#1f2937',
            colorTextPlaceholder: '#9ca3af',
            borderRadius: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
        },
      });
      const paymentElement = elements.create('payment', { layout: 'tabs' });
      // Wait one tick for the panel to actually render before mounting.
      stripeRef.current = stripe;
      elementsRef.current = elements;
      setPhase('ready');
      // Defer to next tick so #stripe-payment-element is in the DOM.
      requestAnimationFrame(() => {
        if (mountRef.current) paymentElement.mount(mountRef.current);
      });
    } catch (e) {
      setError(e?.message || 'Could not start payment.');
      setPhase('error');
    }
  };

  const submitPayment = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setPhase('submitting');
    setError('');

    // Confirm the PaymentIntent. confirmPayment redirects for some flows
    // (3DS, ACH, etc.) — `redirect: 'if_required'` keeps card payments inline.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed.');
      setPhase('ready');
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      setPhase('success');
      return;
    }
    if (paymentIntent?.status === 'processing') {
      // ACH and some card flows land here briefly; the webhook will finalize.
      setPhase('success');
      return;
    }
    setError(`Payment status: ${paymentIntent?.status || 'unknown'}`);
    setPhase('ready');
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (phase === 'success') {
    return (
      <div style={{
        padding: '20px 24px', background: '#f0fdf4', border: `1px solid #86efac`,
        borderRadius: 10, marginBottom: 16, color: '#166534',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Payment Received
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.5 }}>
          Thanks — {amount ? fmtMoney(amount) : 'your payment'} has been received. A receipt was emailed to you.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px 24px', background: '#fff', border: `1.5px solid ${accent}`,
      borderRadius: 10, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Pay Online
          </div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            Card, ACH, Apple Pay, Google Pay — secured by Stripe.
          </div>
        </div>
        {phase === 'idle' && (
          <button
            onClick={startPayment}
            style={{
              background: accent, color: '#fff', border: 'none',
              padding: '12px 26px', borderRadius: 8, cursor: 'pointer',
              fontSize: 15, fontWeight: 800, letterSpacing: '0.02em',
              boxShadow: `0 2px 6px ${accent}55`,
            }}
          >
            Pay with Card →
          </button>
        )}
        {phase === 'loading' && (
          <span style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>Loading…</span>
        )}
      </div>

      {(phase === 'ready' || phase === 'submitting') && (
        <>
          <div ref={mountRef} style={{ marginTop: 8, marginBottom: 12 }} />
          <button
            onClick={submitPayment}
            disabled={phase === 'submitting'}
            style={{
              width: '100%', background: accent, color: '#fff', border: 'none',
              padding: '14px', borderRadius: 8,
              cursor: phase === 'submitting' ? 'wait' : 'pointer',
              fontSize: 16, fontWeight: 800, letterSpacing: '0.02em',
              opacity: phase === 'submitting' ? 0.6 : 1,
            }}
          >
            {phase === 'submitting' ? 'Processing…' : `Pay ${amount ? fmtMoney(amount) : ''}`}
          </button>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
            Your payment is processed securely by Stripe. Your card details never touch our servers.
          </div>
        </>
      )}

      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px', background: '#fef2f2',
          border: '1px solid #fca5a5', borderRadius: 6,
          fontSize: 13, color: '#991b1b',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default StripePayPanel;
