// Customer-facing public invoice viewer.
// URL: https://app.thetradevoice.com/i/<share_token>
// Loads the invoice via a security-definer RPC (no auth required), renders a
// clean read-only document with the contractor's branding and payment
// instructions. No on-page card collection yet — that lands when Stripe
// Connect is wired. For now the customer sees the invoice + how to pay
// (Venmo / Zelle / Check / Cash / etc. as configured by the contractor).

import React, { useState, useEffect } from "react";
import { getPublicInvoice } from "./data/invoices";

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
  errorBold: '#b91c1c',
  errorLo:   '#fef2f2',
  success:   '#15803d',
};

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Same calc as the in-app invoice — total + balance.
const calcInvoiceTotals = (inv) => {
  const labor    = (inv.labor || []).reduce((s, r) => s + (r.hrs || 0) * (r.rate || 0), 0);
  const mats     = (inv.materials || []).reduce((s, r) => s + (r.qty || 0) * (r.cost || 0), 0);
  const equip    = (inv.equipment || []).reduce((s, r) => s + (r.qty || 0) * (r.rate || 0), 0);
  const sub      = labor + mats + equip;
  const mkAmt    = (mats + equip) * (Number(inv.markup) || 0) / 100;
  const txAmt    = (mats + equip + mkAmt + labor) * (Number(inv.tax) || 0) / 100;
  const total    = sub + mkAmt + txAmt;
  const paid     = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance  = Math.max(0, total - paid);
  return { labor, mats, equip, sub, mkAmt, txAmt, total, paid, balance };
};

export function InvoicePaymentPage({ token }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getPublicInvoice(token);
        if (cancelled) return;
        if (!result || !result.invoice) {
          setError("This invoice link isn't valid. Check with your contractor for the correct URL.");
        } else {
          setData(result);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Couldn't load this invoice. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading invoice…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 28px', maxWidth: 460, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>Invoice not found</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{error || "We couldn't find an invoice with that link."}</div>
        </div>
      </div>
    );
  }

  const { invoice: inv, profile } = data;
  const calc = calcInvoiceTotals(inv);
  const accent = profile?.accentColor || C.green;
  const isPaid = inv.status === 'paid' || calc.balance < 0.01;
  const isVoid = inv.status === 'void';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 16px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Top status banner */}
        {isVoid && (
          <div style={{ background: C.errorLo, border: `1px solid ${C.error}33`, color: C.errorBold, padding: '14px 18px', borderRadius: 10, marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
            This invoice has been voided.
          </div>
        )}
        {isPaid && !isVoid && (
          <div style={{ background: '#f0fdf4', border: `1px solid ${C.success}33`, color: C.success, padding: '14px 18px', borderRadius: 10, marginBottom: 16, fontSize: 15, fontWeight: 700 }}>
            ✓ This invoice is paid. Thank you!
          </div>
        )}

        {/* The invoice document */}
        <div style={{ background: C.surface, borderRadius: 4, boxShadow: '0 6px 50px #00000033', overflow: 'hidden' }}>
          <div style={{ height: 6, background: accent }} />

          {/* Header — contractor branding + invoice meta */}
          <div style={{ padding: '32px 32px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderBottom: `1.5px solid ${C.border}` }}>
            <div>
              {profile?.logoUrl ? (
                <img src={profile.logoUrl} alt={profile.company || 'Logo'} style={{ maxHeight: 64, maxWidth: 220, objectFit: 'contain', display: 'block', marginBottom: 12 }} />
              ) : (
                <div style={{ fontSize: 22, fontWeight: 900, color: accent, marginBottom: 6, letterSpacing: '-0.01em' }}>{profile?.company || profile?.name || 'Tradevoice'}</div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, color: '#222', marginBottom: 2 }}>{profile?.company || profile?.name || ''}</div>
              {profile?.tagline && <div style={{ fontSize: 13, color: accent, fontWeight: 600, marginBottom: 4 }}>{profile.tagline}</div>}
              <div style={{ fontSize: 14, color: '#777', lineHeight: 1.7 }}>
                {profile?.phone && <div>{profile.phone}</div>}
              </div>
              {profile?.license && <div style={{ marginTop: 6, fontSize: 13, color: '#888', fontStyle: 'italic' }}>{profile.license}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#111', letterSpacing: '0.04em', lineHeight: 1 }}>INVOICE</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: accent, letterSpacing: '0.08em', marginTop: 6 }}>{inv.number}</div>
              <div style={{ marginTop: 18, display: 'inline-grid', gridTemplateColumns: 'auto auto', gap: '4px 16px', textAlign: 'right' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</span>
                <span style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>{inv.createdAt || '—'}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Due</span>
                <span style={{ fontSize: 14, color: inv.status === 'overdue' ? C.error : '#222', fontWeight: 600 }}>{inv.dueAt || 'On receipt'}</span>
              </div>
            </div>
          </div>

          {/* Bill To + Job */}
          <div style={{ padding: '18px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, background: '#f9f9f9', borderBottom: `1.5px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: 6 }}>Bill To</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{inv.clientName || '—'}</div>
              {inv.clientAddress && <div style={{ fontSize: 14, color: '#777', marginTop: 2, lineHeight: 1.5 }}>{inv.clientAddress}</div>}
              {inv.clientEmail && <div style={{ fontSize: 14, color: '#777' }}>{inv.clientEmail}</div>}
              {inv.clientPhone && <div style={{ fontSize: 14, color: '#777' }}>{inv.clientPhone}</div>}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: 6 }}>Job</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111', lineHeight: 1.4 }}>{inv.title}</div>
              {inv.techName && (
                <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb' }}>Performed by </span>
                  <span style={{ fontWeight: 700, color: '#222' }}>{inv.techName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div style={{ padding: '0 32px', overflowX: 'auto' }}>
            {[
              { label: 'Labor',                rows: inv.labor,     type: 'labor'     },
              { label: 'Materials & Parts',    rows: inv.materials, type: 'materials' },
              { label: 'Equipment & Rental',   rows: inv.equipment, type: 'equipment' },
            ].filter(s => s.rows?.length > 0).map(({ label, rows, type }) => (
              <div key={label}>
                <div style={{ padding: '14px 0 6px', fontSize: 14, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', borderTop: '1px solid #eee' }}>{label}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #222' }}>
                      {(type === 'labor'
                        ? ['Description', 'Hrs', '$/Hr', 'Amount']
                        : ['Description', 'Qty', 'Unit', 'Rate', 'Amount']
                      ).map((h, i) => (
                        <th key={h} style={{ padding: '8px 8px', textAlign: i === 0 ? 'left' : 'right', fontSize: 12, fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '11px 8px', fontSize: 15, color: '#222' }}>{r.desc}</td>
                        {type === 'labor' ? (
                          <>
                            <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 15, color: '#555' }}>{r.hrs}</td>
                            <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 15, color: '#555' }}>{fmt(r.rate)}</td>
                            <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#111' }}>{fmt((r.hrs || 0) * (r.rate || 0))}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 15, color: '#555' }}>{r.qty}</td>
                            <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 14, color: '#aaa', fontStyle: 'italic' }}>{r.unit}</td>
                            <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 15, color: '#555' }}>{fmt(type === 'materials' ? r.cost : r.rate)}</td>
                            <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#111' }}>
                              {fmt((r.qty || 0) * (type === 'materials' ? r.cost : r.rate || 0))}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: '20px 32px 28px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 320, maxWidth: '100%' }}>
              <div style={{ background: '#f7f7f7', border: '1px solid #ebebeb', borderRadius: 4, overflow: 'hidden' }}>
                {[
                  ['Subtotal',                    fmt(calc.sub)],
                  [`Markup (${inv.markup || 0}%)`, fmt(calc.mkAmt)],
                  [`Tax (${inv.tax || 0}%)`,       fmt(calc.txAmt)],
                ].filter(([, v]) => v !== '$0.00').map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontSize: 14, color: '#777', borderBottom: '1px solid #e8e8e8' }}>
                    <span>{label}</span><span style={{ fontWeight: 600, color: '#444' }}>{val}</span>
                  </div>
                ))}
                {calc.paid > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontSize: 14, color: C.success, borderBottom: '1px solid #e8e8e8' }}>
                    <span>Paid</span><span style={{ fontWeight: 700 }}>−{fmt(calc.paid)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: isPaid ? C.success : accent }}>
                  <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>
                    {isPaid ? 'Paid' : 'Total Due'}
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                    {fmt(isPaid ? calc.total : calc.balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* How to pay — only when not paid */}
          {!isPaid && !isVoid && (() => {
            const pay = profile?.payments || {};
            const methods = [];
            if (pay.venmo?.handle?.trim())   methods.push({ label: 'Venmo',    detail: `@${pay.venmo.handle.replace(/^@/, '')}` });
            if (pay.cashapp?.handle?.trim()) methods.push({ label: 'Cash App', detail: `$${pay.cashapp.handle.replace(/^\$/, '')}` });
            if (pay.zelle?.handle?.trim())   methods.push({ label: 'Zelle',    detail: pay.zelle.handle });
            if (pay.check?.handle?.trim())   methods.push({ label: 'Check',    detail: `Make payable to ${profile?.company || profile?.name || 'us'} · ${pay.check.handle}` });
            if (pay.cash?.enabled)           methods.push({ label: 'Cash',     detail: 'Accepted in person' });

            if (methods.length === 0) {
              return (
                <div style={{ padding: '20px 32px', borderTop: `1.5px solid ${C.border}`, background: '#fafafa', fontSize: 14, color: '#777', lineHeight: 1.6 }}>
                  Contact {profile?.company || profile?.name || 'your contractor'} for payment instructions.
                  {profile?.phone && <> · <strong style={{ color: '#222' }}>{profile.phone}</strong></>}
                </div>
              );
            }
            return (
              <div style={{ padding: '20px 32px 26px', borderTop: `1.5px solid ${C.border}`, background: '#fafafa' }}>
                <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: 12 }}>How to Pay</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 24px' }}>
                  {methods.map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#333' }}>{m.label}</div>
                      <div style={{ fontSize: 13, color: '#777', marginTop: 2, lineHeight: 1.5 }}>{m.detail}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
                  After paying, your contractor will mark this invoice paid. Questions?
                  {profile?.phone && <> Call <strong style={{ color: '#666' }}>{profile.phone}</strong>.</>}
                </div>
              </div>
            );
          })()}

          {/* Notes */}
          {inv.notes && (
            <div style={{ padding: '16px 32px 22px', borderTop: `1.5px solid ${C.border}`, background: '#fafafa' }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: 5 }}>Notes</div>
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{inv.notes}</div>
            </div>
          )}

          {/* Footer — small Tradevoice branding */}
          <div style={{ padding: '12px 32px', background: '#f4f4f4', borderTop: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>{inv.number} · {inv.createdAt}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Powered by</span>
              <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1 }}>
                <span style={{ color: C.green }}>TRADE</span><span style={{ color: '#bbb' }}>VOICE</span>
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: C.dim }}>
          This invoice was sent via <a href="https://thetradevoice.com" style={{ color: C.green, fontWeight: 700, textDecoration: 'none' }}>Tradevoice</a>
        </div>
      </div>
    </div>
  );
}

export default InvoicePaymentPage;
