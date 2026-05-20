// Owner-side payment-method modal. Mounted from Settings → Billing
// ("Add Payment Method" button) and from the dashboard trial banner.
//
// Flow:
//   1. POST /api/stripe/setup-intent → creates a Stripe Customer (or
//      reuses an existing one) and returns a SetupIntent client_secret +
//      the publishable key
//   2. Lazy-import @stripe/stripe-js and mount Stripe Elements
//   3. User enters card → confirmCardSetup() attaches the PM to the customer
//   4. POST /api/stripe/create-subscription with the new PM id → creates
//      the trial subscription on Stripe (28-day trial, then auto-charges
//      the right Price ID for the user's plan)
//   5. On success, parent updates user state via onSaved() to show the
//      "Subscription active" UI in Settings
//
// "Plan ID" maps to the Stripe Price ID via env var on the API side; the
// front-end just sends the user's plan slug ('solo'|'pro'|'all').

import { useEffect, useRef, useState } from "react";
import { useBreakpoint } from "./lib/useBreakpoint";

export function BillingPaymentModal({ user, plan, onClose, onSaved }) {
  const { isTablet } = useBreakpoint();
  const [phase, setPhase] = useState('idle');     // idle | loading | ready | submitting | success | error
  const [error, setError] = useState('');
  const stripeRef   = useRef(null);
  const elementsRef = useRef(null);
  const cardElRef   = useRef(null);
  const cardMountRef = useRef(null);

  // Init: fetch SetupIntent + lazy-load Stripe.js + mount Elements.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhase('loading');
      setError('');
      try {
        const r = await fetch('/api/stripe/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email:  user.email,
            name:   user.name || user.company,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Could not start payment setup.');
        if (cancelled) return;

        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(j.publishableKey);
        if (!stripe) throw new Error('Stripe.js failed to initialize.');

        const elements = stripe.elements({
          clientSecret: j.clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#2d6a4f',
              colorText: '#1f2937',
              borderRadius: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            },
          },
        });
        const paymentElement = elements.create('payment', { layout: 'tabs' });

        stripeRef.current = stripe;
        elementsRef.current = elements;
        cardElRef.current = paymentElement;
        setPhase('ready');
        requestAnimationFrame(() => {
          if (cardMountRef.current) paymentElement.mount(cardMountRef.current);
        });
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Could not start payment setup.');
          setPhase('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setPhase('submitting');
    setError('');

    // Confirm the SetupIntent — saves the card to the customer.
    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message || 'Could not save card.');
      setPhase('ready');
      return;
    }
    const paymentMethodId = typeof setupIntent?.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id;
    if (!paymentMethodId) {
      setError('Setup completed but no payment method was returned.');
      setPhase('ready');
      return;
    }

    // Now create the subscription with this PM.
    try {
      const r = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, plan, paymentMethodId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || j.error || 'Could not create subscription.');
      setPhase('success');
      if (onSaved) onSaved({
        stripe_subscription_id:   j.subscriptionId,
        subscription_status:      j.status,
        trial_ends_at:            j.trialEndsAt,
        stripe_payment_method_id: paymentMethodId,
      });
    } catch (e) {
      setError(e?.message || 'Could not activate subscription.');
      setPhase('ready');
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: isTablet ? 520 : 640,
        maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ padding: '20px 24px', background: '#2d6a4f', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>Activate Subscription</div>
            <div style={{ fontSize: 19, fontWeight: 700, marginTop: 2 }}>Add Payment Method</div>
          </div>
          <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {phase === 'success' ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>✓ Subscription Active</div>
              <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                Your card is saved. Tradevoice won't charge until your 28-day trial ends, then it auto-renews monthly.
              </div>
              <button onClick={onClose} style={{ marginTop: 16, padding: '12px 28px', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
                Add a card to continue using Tradevoice after your trial ends. We'll <strong style={{ color: '#1f2937' }}>start the 28-day trial now</strong> and only charge when it expires. Cancel anytime.
              </div>

              <div ref={cardMountRef} style={{ minHeight: 160, marginBottom: 16 }}>
                {phase === 'loading' && <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading secure card form…</div>}
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, color: '#991b1b', marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={phase !== 'ready' && phase !== 'submitting'}
                style={{
                  width: '100%', padding: '14px',
                  background: '#2d6a4f', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 16, fontWeight: 800, letterSpacing: '0.02em',
                  cursor: phase === 'submitting' ? 'wait' : 'pointer',
                  opacity: (phase !== 'ready' && phase !== 'submitting') ? 0.5 : 1,
                }}
              >
                {phase === 'submitting' ? 'Saving…' : 'Save Card & Start 28-Day Trial'}
              </button>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                Card processed securely by Stripe. Your details never touch our servers.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BillingPaymentModal;
