// Customer-facing public quote viewer.
// URL: https://app.thetradevoice.com/q/<share_token>
//
// Mirrors InvoicePaymentPage but for quotes. The customer reviews the quote
// and either taps Accept or just closes the tab (no decline button — a
// silent "no" is fine; the contractor follows up if interested). On accept,
// the status flips server-side via security-definer RPC and the panel
// swaps into a green confirmation.

import React, { useState, useEffect } from "react";
import { getPublicQuote, acceptPublicQuote, markPublicQuoteViewed } from "./data/quotes";

const C = {
  bg:        '#f3f6f4',
  surface:   '#ffffff',
  border:    '#e6ede9',
  border2:   '#cfdfd6',
  text:      '#0f172a',
  muted:     '#475569',
  dim:       '#64748b',
  green:     '#2d6a4f',
  greenLo:   '#eef7f2',
  accent:    '#ea580c',
  accentLo:  '#fff4ed',
  warn:      '#d97706',
  warnLo:    '#fef3c7',
  error:     '#dc2626',
  success:   '#15803d',
};

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Same calc the in-app quote uses. Kept in sync manually with App.jsx
// calcQuote — these are simple enough that reimplementing here keeps the
// public bundle from importing the entire App.jsx.
const calcQuoteTotals = (q) => {
  const labor    = (q.labor || []).reduce((s, r) => s + (r.hrs || 0) * (r.rate || 0), 0);
  const mats     = (q.materials || []).reduce((s, r) => s + (r.qty || 0) * (r.cost || 0), 0);
  const equip    = (q.equipment || []).reduce((s, r) => s + (r.qty || 0) * (r.rate || 0), 0);
  const sub      = labor + mats + equip;
  const mkAmt    = (mats + equip) * (Number(q.markup) || 0) / 100;
  const txAmt    = (mats + equip + mkAmt + labor) * (Number(q.tax) || 0) / 100;
  const total    = sub + mkAmt + txAmt;
  return { labor, mats, equip, sub, mkAmt, txAmt, total };
};

export function QuoteCustomerPage({ token }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getPublicQuote(token);
        if (cancelled) return;
        if (!result) { setError('We couldn\'t find this quote. The link may have expired or been mistyped.'); }
        else         { setData(result); }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Could not load this quote.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // Fire-and-forget "mark viewed" — independent of the load.
    markPublicQuoteViewed(token);
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    setAcceptError('');
    try {
      const r = await acceptPublicQuote(token);
      if (r?.ok) {
        // Optimistically reflect new status in the UI without a refetch.
        setData(prev => prev ? { ...prev, quote: { ...prev.quote, status: 'accepted' } } : prev);
      } else {
        setAcceptError(r?.error || 'Could not accept the quote. Try again.');
      }
    } catch (e) {
      setAcceptError(e?.message || 'Could not accept the quote.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Loading…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 28, maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>Quote not found</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{error || 'This quote is no longer available.'}</div>
        </div>
      </div>
    );
  }

  const { quote: q, profile } = data;
  const accent  = profile?.accentColor || C.green;
  const totals  = calcQuoteTotals(q);
  const isAccepted = q.status === 'accepted';
  const isDeclined = q.status === 'declined';
  const isInvoiced = q.status === 'invoiced';
  const isRevised  = q.status === 'revised';
  const isExpired  = q.expiresAt && q.expiresAt < new Date().toISOString().split('T')[0];
  const canAccept  = !isAccepted && !isDeclined && !isInvoiced && !isRevised && !isExpired;

  // Status pill copy
  const statusLabel = isAccepted ? 'Accepted'
    : isDeclined ? 'Declined'
    : isInvoiced ? 'Invoiced'
    : isRevised  ? 'Revised'
    : isExpired  ? 'Expired'
    : 'Awaiting your response';
  const statusBg = isAccepted ? '#dcfce7'
    : isDeclined ? '#fee2e2'
    : isInvoiced ? '#dbeafe'
    : isRevised  ? '#fef3c7'
    : isExpired  ? '#f3f4f6'
    : '#fef3c7';
  const statusFg = isAccepted ? C.success
    : isDeclined ? C.error
    : isInvoiced ? '#1d4ed8'
    : isRevised  ? C.warn
    : isExpired  ? C.dim
    : C.warn;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.04)' }}>

          {/* Branded header */}
          <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`, color: '#fff', padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>Quote</div>
                <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 28, fontWeight: 900, marginTop: 4 }}>{q.number}</div>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>{q.title || 'Project quote'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {profile?.logoUrl && (
                  <img src={profile.logoUrl} alt={profile?.company || profile?.name || ''} style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', marginBottom: 8 }} />
                )}
                <div style={{ fontSize: 16, fontWeight: 800 }}>{profile?.company || profile?.name || 'Contractor'}</div>
                {profile?.phone && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{profile.phone}</div>}
                {profile?.license && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>License {profile.license}</div>}
              </div>
            </div>
          </div>

          {/* Status banner */}
          <div style={{ padding: '14px 32px', background: statusBg, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: statusFg, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {statusLabel}
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
              {q.expiresAt && !isAccepted && !isDeclined && !isInvoiced && (
                <>Valid until {q.expiresAt}</>
              )}
            </div>
          </div>

          {/* Big total */}
          <div style={{ padding: '28px 32px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Quote Total</div>
            <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 44, fontWeight: 900, color: accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {fmt(totals.total)}
            </div>
            {q.scope && (
              <div style={{ marginTop: 18, fontSize: 14, color: C.muted, lineHeight: 1.65, textAlign: 'left', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'left' }}>Scope of work</div>
                {q.scope}
              </div>
            )}
          </div>

          {/* Line items — labor */}
          {q.labor?.length > 0 && (
            <Section title="Labor">
              {q.labor.map((r, i) => (
                <Row key={'l' + i} desc={r.desc || 'Labor'} qty={`${r.hrs || 0} hr`} rate={fmt(r.rate)} total={fmt((r.hrs || 0) * (r.rate || 0))} />
              ))}
            </Section>
          )}

          {/* Materials */}
          {q.materials?.length > 0 && (
            <Section title="Materials">
              {q.materials.map((r, i) => (
                <Row key={'m' + i} desc={r.desc || 'Material'} qty={`${r.qty || 0} ${r.unit || ''}`.trim()} rate={fmt(r.cost)} total={fmt((r.qty || 0) * (r.cost || 0))} />
              ))}
            </Section>
          )}

          {/* Equipment */}
          {q.equipment?.length > 0 && (
            <Section title="Equipment">
              {q.equipment.map((r, i) => (
                <Row key={'e' + i} desc={r.desc || 'Equipment'} qty={`${r.qty || 0} ${r.unit || ''}`.trim()} rate={fmt(r.rate)} total={fmt((r.qty || 0) * (r.rate || 0))} />
              ))}
            </Section>
          )}

          {/* Totals breakdown */}
          <div style={{ padding: '18px 32px', background: '#fafafa', borderTop: `1px solid ${C.border}` }}>
            <Totline label="Subtotal" value={fmt(totals.sub)} />
            {totals.mkAmt > 0 && <Totline label={`Markup ${q.markup}%`} value={fmt(totals.mkAmt)} />}
            {totals.txAmt > 0 && <Totline label={`Tax ${q.tax}%`} value={fmt(totals.txAmt)} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 8, borderTop: `1.5px solid ${C.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: accent, fontFamily: '"Playfair Display", Georgia, serif', fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.total)}</div>
            </div>
          </div>

          {/* Accept block */}
          {canAccept && (
            <div style={{ padding: '22px 32px', borderTop: `1.5px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Ready to move forward?</div>
              <button
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  width: '100%',
                  background: accent, color: '#fff',
                  border: 'none', borderRadius: 10,
                  padding: '16px',
                  fontSize: 17, fontWeight: 800, letterSpacing: '0.02em',
                  cursor: accepting ? 'wait' : 'pointer',
                  opacity: accepting ? 0.6 : 1,
                  boxShadow: `0 2px 8px ${accent}55`,
                }}
              >
                {accepting ? 'Accepting…' : `Accept Quote — ${fmt(totals.total)}`}
              </button>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
                Tapping Accept tells {profile?.company || profile?.name || 'your contractor'} you'd like to move forward.
                {profile?.phone && <> Questions? Call <strong style={{ color: C.muted }}>{profile.phone}</strong>.</>}
              </div>
              {acceptError && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: `1px solid ${C.error}55`, borderRadius: 6, fontSize: 13, color: C.error }}>
                  {acceptError}
                </div>
              )}
            </div>
          )}

          {/* Already-accepted confirmation */}
          {isAccepted && (
            <div style={{ padding: '22px 32px', borderTop: `1.5px solid ${C.border}`, background: '#f0fdf4' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.success, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Quote Accepted</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 6 }}>
                Thanks — {profile?.company || profile?.name || 'your contractor'} will reach out to schedule next steps.
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: '12px 32px', background: '#f4f4f4', borderTop: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>{q.number} · {q.createdAt}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Powered by</span>
              <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1 }}>
                <span style={{ color: C.green }}>TRADE</span><span style={{ color: '#bbb' }}>VOICE</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section heading + row helpers — kept tiny since they're only used here.
function Section({ title, children }) {
  return (
    <div style={{ padding: '16px 32px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}
function Row({ desc, qty, rate, total }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px', gap: 12, padding: '8px 0', fontSize: 13, alignItems: 'center', color: C.text }}>
      <div style={{ fontWeight: 600 }}>{desc}</div>
      <div style={{ color: C.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{qty}</div>
      <div style={{ color: C.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{rate}</div>
      <div style={{ fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{total}</div>
    </div>
  );
}
function Totline({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: C.muted }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default QuoteCustomerPage;
