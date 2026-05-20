import React, { useState, useEffect, useMemo } from "react";
import { listClients } from "./data/clients";
import {
  listPlanSubscriptions, calcMrr, calcArr, countByStatus,
  startEnrollmentCheckout, cancelEnrollmentSubscription,
  cancelPlanSubscription,
} from "./data/planSubscriptions";
import { useEscapeClose } from "./lib/useEscapeClose";
import { useBreakpoint } from "./lib/useBreakpoint";

// Small palette aligned with the rest of the app (avoid importing C from App.jsx
// to keep this component independently lazy-loadable).
const C = {
  bg:        '#f3f6f4',
  surface:   '#ffffff',
  border:    '#e6ede9',
  text:      '#0f172a',
  muted:     '#475569',
  dim:       '#64748b',
  green:     '#2d6a4f',
  greenLo:   '#eef7f2',
  accent:    '#ea580c',
  error:     '#dc2626',
  errorBold: '#b91c1c',
  errorLo:   '#fef2f2',
  warn:      '#d97706',
  warnLo:    '#fef3c7',
  success:   '#15803d',
  shadow1:   '0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.03)',
};

const FREQUENCY_PRESETS = [
  { label: 'Monthly',     months: 1  },
  { label: 'Quarterly',   months: 3  },
  { label: 'Semi-annual', months: 6  },
  { label: 'Annual',      months: 12 },
  { label: 'Every 2 yrs', months: 24 },
];

// Date helpers
const today = () => new Date().toISOString().split('T')[0];
const addMonths = (isoDate, months) => {
  const d = new Date(isoDate + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const frequencyLabel = (months) => {
  const preset = FREQUENCY_PRESETS.find(p => p.months === months);
  return preset ? preset.label : `Every ${months} month${months === 1 ? '' : 's'}`;
};

// ────────────────────────────────────────────────────────────────────────────
// PLAN CREATE / EDIT MODAL
// ────────────────────────────────────────────────────────────────────────────
function PlanModal({ initial, clients, team, trades, onClose, onSave }) {
  const { isTablet } = useBreakpoint();
  useEscapeClose(onClose);
  const [title,            setTitle]      = useState(initial?.title           || '');
  const [clientId,         setClientId]   = useState(initial?.clientId        || '');
  const [clientName,       setClientName] = useState(initial?.clientName      || '');
  const [trade,            setTrade]      = useState(initial?.trade           || trades[0] || 'Plumber');
  const [frequencyMonths,  setFreq]       = useState(initial?.frequencyMonths || 12);
  const [defaultDuration,  setDuration]   = useState(initial?.defaultDuration || 2);
  const [defaultTechUserId, setTech]      = useState(initial?.defaultTechUserId || '');
  const [startedAt,        setStartedAt]  = useState(initial?.startedAt       || today());
  const [notes,            setNotes]      = useState(initial?.notes           || '');
  // ── Service contract billing (migration 0017) ──
  // Optional: if filled in, this plan becomes a recurring revenue product
  // the contractor can enroll customers into (Phase 1 = manual enrollment
  // tracking, Phase 2 = real Stripe Connect subscriptions auto-billing the
  // customer monthly/yearly).
  const [billingAmount,    setBillingAmount]   = useState(initial?.billingAmount != null ? String(initial.billingAmount) : '');
  const [billingInterval,  setBillingInterval] = useState(initial?.billingInterval || 'month');
  const [customerBenefits, setCustomerBenefits]= useState(initial?.customerBenefits || '');
  const [saving,           setSaving]     = useState(false);

  // When user picks a known client from the dropdown, snapshot their name.
  const handleClientChange = (id) => {
    setClientId(id);
    const c = clients.find(c => c.id === id);
    if (c) setClientName(c.name);
  };

  const canSave = title.trim() && (clientName.trim() || clientId);

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // If editing, preserve nextDueAt unless they bumped startedAt.
      const nextDueAt = initial?.nextDueAt || addMonths(startedAt, 0); // start_date as the first due date
      await onSave({
        ...initial,
        title:            title.trim(),
        clientId:         clientId || null,
        clientName:       clientName.trim() || null,
        trade,
        frequencyMonths:  Number(frequencyMonths) || 12,
        defaultDuration:  Number(defaultDuration) || 2,
        defaultTechUserId: defaultTechUserId || null,
        startedAt,
        nextDueAt,
        notes: notes.trim() || null,
        active: initial?.active !== false,
        // Service contract billing — null if left blank (this plan is
        // service-only, not a paid contract product).
        billingAmount:    billingAmount === '' ? null : Number(billingAmount),
        billingInterval:  billingInterval || 'month',
        customerBenefits: customerBenefits.trim() || null,
      });
      onClose();
    } catch (e) {
      alert(e?.message || 'Could not save plan.');
    } finally {
      setSaving(false);
    }
  };

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal:   { background: '#fff', borderRadius: 14, width: '100%', maxWidth: isTablet ? 520 : 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)' },
    header:  { background: C.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body:    { padding: '20px 24px' },
    label:   { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.muted, marginBottom: 6, display: 'block', marginTop: 14 },
    // 16px font + 44px min height — iOS Safari otherwise zooms the page on
    // input focus, and tap targets <44pt are unreliable on touch.
    input:   { width: '100%', padding: '12px 14px', fontSize: 16, minHeight: 44, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    select:  { width: '100%', padding: '12px 14px', fontSize: 16, minHeight: 44, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
    row2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    footer:  { padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary, disabled) => ({
      flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : `1px solid ${C.border}`,
      background: primary ? C.green : '#fff',
      color: primary ? '#fff' : C.muted,
      fontSize: 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }),
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{initial ? 'Edit Plan' : 'New Maintenance Plan'}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={s.body}>
          <label style={s.label}>Plan Title</label>
          <input style={s.input} placeholder="e.g. Annual HVAC Tune-Up" value={title} onChange={e => setTitle(e.target.value)} />

          <label style={s.label}>Client</label>
          {clients.length > 0 ? (
            <>
              <select style={s.select} value={clientId} onChange={e => handleClientChange(e.target.value)}>
                <option value="">— Type a name below —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
              <input style={{ ...s.input, marginTop: 6 }} placeholder="Or type a client name" value={clientName} onChange={e => { setClientName(e.target.value); setClientId(''); }} />
            </>
          ) : (
            <input style={s.input} placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)} />
          )}

          <div style={s.row2}>
            <div>
              <label style={s.label}>Trade</label>
              <select style={s.select} value={trade} onChange={e => setTrade(e.target.value)}>
                {(trades.length ? trades : ['Plumber','HVAC','Electrician','Roofing','Specialty']).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Frequency</label>
              <select style={s.select} value={frequencyMonths} onChange={e => setFreq(Number(e.target.value))}>
                {FREQUENCY_PRESETS.map(p => <option key={p.months} value={p.months}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div style={s.row2}>
            <div>
              <label style={s.label}>Default Duration (hrs)</label>
              <input type="number" min="0.5" step="0.5" style={s.input} value={defaultDuration} onChange={e => setDuration(Number(e.target.value))} />
            </div>
            <div>
              <label style={s.label}>Preferred Tech</label>
              <select style={s.select} value={defaultTechUserId} onChange={e => setTech(e.target.value)}>
                <option value="">— Anyone —</option>
                {team.map(t => <option key={t.id} value={t.userId || t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <label style={s.label}>Start Date</label>
          <input type="date" style={s.input} value={startedAt} onChange={e => setStartedAt(e.target.value)} />
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            First service due {formatDate(startedAt)} → recurring {frequencyLabel(frequencyMonths).toLowerCase()}
          </div>

          <label style={s.label}>Notes (optional)</label>
          <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Equipment notes, gate codes, special instructions..." />

          {/* ── Service contract billing (optional) ──
              Leave blank if this plan is service-only (you schedule visits
              but bill per visit via invoices). Fill in to make it a
              recurring revenue product the customer pays monthly/yearly. */}
          <div style={{ marginTop: 22, padding: '14px 16px', background: '#f0fdf4', border: `1px solid ${C.green}33`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, marginBottom: 4 }}>Service Contract Pricing (Optional)</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
              Leave blank for service-only plans (bill per visit). Fill in to make this a recurring revenue product — customers subscribe at this rate.
            </div>
            <div style={s.row2}>
              <div>
                <label style={s.label}>Subscription Price</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16, color: C.muted, fontWeight: 700 }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="25.00"
                    style={s.input}
                    value={billingAmount}
                    onChange={e => setBillingAmount(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={s.label}>Billing Interval</label>
                <select style={s.select} value={billingInterval} onChange={e => setBillingInterval(e.target.value)}>
                  <option value="month">Per Month</option>
                  <option value="year">Per Year</option>
                </select>
              </div>
            </div>
            <label style={s.label}>What's included (shown to customers)</label>
            <textarea
              style={{ ...s.input, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
              value={customerBenefits}
              onChange={e => setCustomerBenefits(e.target.value)}
              placeholder="e.g. 2 tune-ups per year · 10% off all repairs · Priority scheduling · Free filter changes"
            />
            {billingAmount && Number(billingAmount) > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff', border: `1px solid ${C.green}44`, borderRadius: 6, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                <strong style={{ color: C.green }}>Recurring revenue preview:</strong>{' '}
                10 customers × ${Number(billingAmount).toFixed(2)}/{billingInterval === 'year' ? 'yr' : 'mo'} ={' '}
                <strong style={{ color: C.green }}>
                  ${(Number(billingAmount) * 10).toFixed(2)}/{billingInterval === 'year' ? 'yr' : 'mo'}
                </strong>
              </div>
            )}
          </div>
        </div>

        <div style={s.footer}>
          <button style={s.btn(false, false)} onClick={onClose}>Cancel</button>
          <button style={s.btn(true, !canSave || saving)} onClick={submit} disabled={!canSave || saving}>
            {saving ? 'Saving…' : (initial ? 'Save Plan' : 'Create Plan')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PLAN ROW
// ────────────────────────────────────────────────────────────────────────────
function PlanRow({ plan, subs = [], clients = [], ownerId, expanded, onToggleExpanded, onEnroll, onSubsChanged, onEdit, onSchedule, onTogglePause, onDelete }) {
  const dueIn = plan.nextDueAt ? daysBetween(today(), plan.nextDueAt) : null;
  const overdue = dueIn !== null && dueIn < 0;
  const dueSoon = dueIn !== null && dueIn >= 0 && dueIn <= 14;
  // Service-contract awareness — show pricing + active-sub count when set
  const isContract     = plan.billingAmount != null && plan.billingAmount > 0;
  const planSubs       = subs.filter(s => s.planId === plan.id);
  const activeSubCount = planSubs.filter(s => s.status === 'active' || s.status === 'trialing').length;
  const planMrr = isContract
    ? activeSubCount * (plan.billingInterval === 'year' ? plan.billingAmount / 12 : plan.billingAmount)
    : 0;

  const statusPill = !plan.active
    ? { label: 'Paused',  bg: '#f1f5f9',     fg: C.muted }
    : overdue
    ? { label: `${Math.abs(dueIn)}d overdue`, bg: C.errorBold, fg: '#fff' }
    : dueSoon
    ? { label: dueIn === 0 ? 'Due today' : `Due in ${dueIn}d`, bg: C.warnLo, fg: C.warn }
    : { label: 'On track', bg: C.greenLo, fg: C.green };

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '14px 16px', marginBottom: 8, display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center',
      boxShadow: C.shadow1,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{plan.title}</div>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 4, background: statusPill.bg, color: statusPill.fg, whiteSpace: 'nowrap',
          }}>{statusPill.label}</span>
          {/* Contract pricing badge — appears only when this plan has
              billing terms set, so service-only plans don't see clutter. */}
          {isContract && (
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 4, background: C.green, color: '#fff', whiteSpace: 'nowrap',
            }}>
              ${Number(plan.billingAmount).toFixed(2)}/{plan.billingInterval === 'year' ? 'yr' : 'mo'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>
          {plan.clientName || 'Unknown client'} · {plan.trade} · {frequencyLabel(plan.frequencyMonths)}
        </div>
        <div style={{ fontSize: 12, color: C.dim }}>
          Last serviced {formatDate(plan.lastServicedAt)} · Next due {formatDate(plan.nextDueAt)}
        </div>
        {/* Subscriber stats — only on contract plans. Clicking expands the
            subscribers panel below. */}
        {isContract && (
          <button
            onClick={() => onToggleExpanded?.(plan.id)}
            style={{
              background: 'none', border: 'none', padding: 0, marginTop: 4,
              fontSize: 12, color: C.muted, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <strong style={{ color: C.green }}>{activeSubCount}</strong> active subscriber{activeSubCount === 1 ? '' : 's'}
            {planMrr > 0 && (
              <> · <strong style={{ color: C.green }}>${planMrr.toFixed(2)}/mo</strong> recurring</>
            )}
            <span style={{ marginLeft: 6, color: C.dim }}>{expanded ? '▴ Hide' : '▾ Show'}</span>
          </button>
        )}
      </div>

      {/* All actions sized to 44px min — iPad-friendly tap targets. */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        {isContract && (
          <button onClick={() => onEnroll?.(plan)} style={{
            padding: '11px 16px', minHeight: 44, borderRadius: 6, border: 'none',
            background: C.green, color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>Enroll Customer</button>
        )}
        <button onClick={() => onSchedule(plan)} style={{
          padding: '11px 16px', minHeight: 44, borderRadius: 6,
          border: isContract ? `1px solid ${C.border}` : 'none',
          background: isContract ? '#fff' : C.green,
          color:      isContract ? C.muted : '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>Schedule Job</button>
        <button onClick={() => onEdit(plan)} style={{
          padding: '11px 14px', minHeight: 44, borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', color: C.muted,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>Edit</button>
        <button onClick={() => onTogglePause(plan)} style={{
          padding: '11px 14px', minHeight: 44, borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', color: C.muted,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>{plan.active ? 'Pause' : 'Resume'}</button>
        <button onClick={() => onDelete(plan)} style={{
          padding: '11px 14px', minHeight: 44, borderRadius: 6, border: `1px solid ${C.error}33`, background: '#fff', color: C.error,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>Delete</button>
      </div>

      {/* Expanded subscribers panel — spans both grid columns. */}
      {isContract && expanded && (
        <div style={{ gridColumn: '1 / -1', marginTop: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
            Subscribers ({planSubs.length})
          </div>
          <SubscribersPanel
            plan={plan}
            subs={planSubs}
            clients={clients}
            ownerId={ownerId}
            onChanged={onSubsChanged}
          />
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ENROLL CUSTOMER MODAL
// ────────────────────────────────────────────────────────────────────────────
// Two-step flow:
//   Step 1 — owner picks an existing client (or types a new email/name)
//   Step 2 — we hit /api/stripe/plan-checkout, then surface the returned
//            Checkout URL with a copy button + "Open in new tab". The
//            contractor can either text/email it to the customer or open
//            it while sitting beside them.
function EnrollModal({ plan, clients, ownerId, onClose, onCreated }) {
  const { isTablet } = useBreakpoint();
  useEscapeClose(onClose);
  const [clientId,   setClientId]   = useState('');
  const [email,      setEmail]      = useState('');
  const [name,       setName]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [checkout,   setCheckout]   = useState(null); // { checkoutUrl, sessionId } once created
  const [copied,     setCopied]     = useState(false);

  const handleClientChange = (id) => {
    setClientId(id);
    const c = clients.find(c => c.id === id);
    if (c) {
      setEmail(c.email || '');
      setName(c.name || '');
    }
  };

  const canSubmit = !!(clientId || email.trim());

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await startEnrollmentCheckout({
        ownerId,
        planId:        plan.id,
        clientId:      clientId || null,
        customerEmail: email.trim() || null,
        customerName:  name.trim()  || null,
      });
      setCheckout(result);
      if (onCreated) onCreated();
    } catch (e) {
      setError(e?.message || 'Could not start enrollment.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyUrl = async () => {
    if (!checkout?.checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(checkout.checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Clipboard API may be blocked — fall back to a visible textarea.
    }
  };

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal:   { background: '#fff', borderRadius: 14, width: '100%', maxWidth: isTablet ? 520 : 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)' },
    header:  { background: C.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body:    { padding: '20px 24px' },
    label:   { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.muted, marginBottom: 6, display: 'block', marginTop: 14 },
    input:   { width: '100%', padding: '12px 14px', fontSize: 16, minHeight: 44, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    select:  { width: '100%', padding: '12px 14px', fontSize: 16, minHeight: 44, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
    footer:  { padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary, disabled) => ({
      flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : `1px solid ${C.border}`,
      background: primary ? C.green : '#fff',
      color: primary ? '#fff' : C.muted,
      fontSize: 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }),
  };

  const intervalLabel = plan.billingInterval === 'year' ? 'year' : 'month';
  const priceLabel = `$${Number(plan.billingAmount).toFixed(2)}/${intervalLabel === 'year' ? 'yr' : 'mo'}`;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            Enroll customer — {plan.title}
          </span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={s.body}>
          {!checkout ? (
            <>
              <div style={{ padding: '10px 14px', background: C.greenLo, borderRadius: 8, fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>
                Subscribing at <strong style={{ color: C.green }}>{priceLabel}</strong>
                {plan.customerBenefits && <> · {plan.customerBenefits}</>}
              </div>

              {clients.length > 0 && (
                <>
                  <label style={s.label}>Existing client</label>
                  <select style={s.select} value={clientId} onChange={e => handleClientChange(e.target.value)}>
                    <option value="">— Or enter new customer below —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.company ? ` (${c.company})` : ''}{c.email ? ` — ${c.email}` : ''}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label style={s.label}>Customer email</label>
              <input
                type="email"
                style={s.input}
                placeholder="customer@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setClientId(''); }}
              />
              <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                Stripe will pre-fill this on the Checkout page so the customer doesn't re-type it.
              </div>

              <label style={s.label}>Customer name (optional)</label>
              <input
                style={s.input}
                placeholder="Jane Doe"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              {error && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: C.errorLo, border: `1px solid ${C.error}33`, borderRadius: 8, fontSize: 13, color: C.errorBold, lineHeight: 1.5 }}>
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ padding: '14px 16px', background: C.greenLo, border: `1px solid ${C.green}33`, borderRadius: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 4 }}>
                  ✓ Checkout link ready
                </div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                  Send this to the customer or open it now to enter their card together. Once they pay, the subscription becomes active automatically.
                </div>
              </div>

              <label style={s.label}>Checkout URL</label>
              <textarea
                readOnly
                value={checkout.checkoutUrl}
                style={{ ...s.input, minHeight: 96, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                onFocus={e => e.target.select()}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={copyUrl} style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
                <a href={checkout.checkoutUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  Open in new tab
                </a>
              </div>
            </>
          )}
        </div>

        <div style={s.footer}>
          {!checkout ? (
            <>
              <button style={s.btn(false, false)} onClick={onClose}>Cancel</button>
              <button style={s.btn(true, !canSubmit || submitting)} onClick={submit} disabled={!canSubmit || submitting}>
                {submitting ? 'Creating link…' : 'Generate Checkout Link'}
              </button>
            </>
          ) : (
            <button style={s.btn(true, false)} onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SUBSCRIBERS PANEL (per-plan)
// ────────────────────────────────────────────────────────────────────────────
// Compact list of plan_subscriptions for a single plan with per-row actions
// (cancel at period end / cancel immediately). Renders inside PlanRow when
// expanded.
function SubscribersPanel({ plan, subs, clients, ownerId, onChanged }) {
  const [busyId, setBusyId] = useState(null);

  const clientName = (sub) => {
    if (sub.clientId) {
      const c = clients.find(c => c.id === sub.clientId);
      if (c) return c.name + (c.company ? ` (${c.company})` : '');
    }
    return sub.pendingName || sub.pendingEmail || 'Unnamed customer';
  };

  const statusPill = (status) => {
    const map = {
      active:     { bg: C.greenLo,  fg: C.green,     label: 'Active' },
      trialing:   { bg: C.greenLo,  fg: C.green,     label: 'Trialing' },
      past_due:   { bg: C.errorLo,  fg: C.errorBold, label: 'Past due' },
      paused:     { bg: '#f1f5f9',  fg: C.muted,     label: 'Paused' },
      canceled:   { bg: '#f1f5f9',  fg: C.muted,     label: 'Canceled' },
      incomplete: { bg: C.warnLo,   fg: C.warn,      label: 'Awaiting card' },
    };
    return map[status] || { bg: '#f1f5f9', fg: C.muted, label: status };
  };

  const handleCancel = async (sub, immediate) => {
    const msg = immediate
      ? `Cancel ${clientName(sub)}'s subscription IMMEDIATELY? They lose access right now and we don't refund the current period.`
      : `Cancel ${clientName(sub)}'s subscription at the end of the current period? They keep what they've paid for.`;
    if (!window.confirm(msg)) return;
    setBusyId(sub.id);
    try {
      if (sub.stripeSubscriptionId) {
        await cancelEnrollmentSubscription({ ownerId, planSubscriptionId: sub.id, immediate });
      } else {
        // No Stripe sub (incomplete / never enrolled via Stripe) — just
        // flip the local row.
        await cancelPlanSubscription(sub.id);
      }
      if (onChanged) await onChanged();
    } catch (e) {
      alert(e?.message || 'Could not cancel subscription.');
    } finally {
      setBusyId(null);
    }
  };

  if (subs.length === 0) {
    return (
      <div style={{ padding: '10px 12px', fontSize: 12, color: C.dim, fontStyle: 'italic' }}>
        No subscribers yet. Click <strong>Enroll Customer</strong> above to send a Stripe Checkout link.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {subs.map(sub => {
        const pill = statusPill(sub.status);
        const isCancellable = sub.status !== 'canceled';
        const busy = busyId === sub.id;
        return (
          <div key={sub.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', background: '#fff', borderRadius: 6,
            border: `1px solid ${C.border}`, gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{clientName(sub)}</span>
                <span style={{
                  display: 'inline-block', fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '2px 7px', borderRadius: 4,
                  background: pill.bg, color: pill.fg,
                }}>{pill.label}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                ${Number(sub.billingAmount).toFixed(2)}/{sub.billingInterval === 'year' ? 'yr' : 'mo'}
                {sub.startedAt && <> · since {formatDate(sub.startedAt)}</>}
                {sub.currentPeriodEnd && sub.status !== 'canceled' && <> · renews {formatDate(sub.currentPeriodEnd)}</>}
              </div>
            </div>
            {isCancellable && (
              <button
                onClick={() => handleCancel(sub, false)}
                disabled={busy}
                style={{
                  padding: '7px 12px', minHeight: 36, borderRadius: 6,
                  border: `1px solid ${C.error}33`, background: '#fff',
                  color: C.error, fontSize: 12, fontWeight: 600,
                  cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}>
                {busy ? 'Canceling…' : 'Cancel'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN PLANS SCREEN
// ────────────────────────────────────────────────────────────────────────────
export default function PlansScreen({
  user, team = [],
  plans = [], persistPlan, removePlan,
  onScheduleFromPlan,
}) {
  const [clients,       setClients]        = useState([]);
  const [subscriptions, setSubscriptions]  = useState([]);
  const [loading,       setLoading]        = useState(true);
  const [editing,       setEditing]        = useState(null);
  const [showNew,       setShowNew]        = useState(false);
  const [filter,        setFilter]         = useState('all'); // all | due | active | paused
  const [enrollPlan,    setEnrollPlan]     = useState(null);   // plan being enrolled into
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [returnBanner,  setReturnBanner]   = useState(null);   // shown after Stripe Checkout return

  // Helper used both at mount and after enroll/cancel actions.
  const refreshSubs = async () => {
    try {
      const subs = await listPlanSubscriptions();
      setSubscriptions(subs);
    } catch (e) {
      console.error('refresh subscriptions', e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Subscriptions table may not exist yet (migration 0017 might not
        // have been run). Fail soft so the rest of the Plans screen still
        // works without recurring-revenue data.
        const [c, subs] = await Promise.all([
          listClients(),
          listPlanSubscriptions().catch(() => []),
        ]);
        if (!cancelled) {
          setClients(c);
          setSubscriptions(subs);
        }
      } catch (e) { console.error('plans load', e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Detect a return from Stripe Checkout via the query string we set in the
  // success_url / cancel_url. Show a banner + force-refresh the subs list so
  // the newly-active subscription appears even if the webhook hasn't fired
  // its update yet (subscription may still be in 'incomplete' for a beat).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const enrollFlag = params.get('enroll');
    if (!enrollFlag) return;
    if (enrollFlag === 'ok') {
      setReturnBanner({ kind: 'ok', text: 'Checkout completed. Subscription will appear here once Stripe confirms the payment.' });
      refreshSubs();
    } else if (enrollFlag === 'cancel') {
      setReturnBanner({ kind: 'cancel', text: 'Customer didn\'t finish checkout. The pending enrollment is still here — you can resend the link from the plan.' });
    }
    // Strip the params from the URL so a refresh doesn't keep re-showing the banner.
    params.delete('enroll');
    params.delete('session_id');
    const cleaned = params.toString();
    const newUrl = window.location.pathname + (cleaned ? `?${cleaned}` : '') + window.location.hash;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // ── Recurring revenue summary (computed from plan_subscriptions) ──
  const mrr  = useMemo(() => calcMrr(subscriptions),  [subscriptions]);
  const arr  = useMemo(() => calcArr(subscriptions),  [subscriptions]);
  const subCounts = useMemo(() => countByStatus(subscriptions), [subscriptions]);
  const hasContractPlans = useMemo(() => plans.some(p => p.billingAmount != null && p.billingAmount > 0), [plans]);

  const trades = user?.trades?.length ? user.trades : ['Plumber','HVAC','Electrician','Roofing','Specialty'];

  const filtered = useMemo(() => {
    if (filter === 'all') return plans;
    if (filter === 'paused') return plans.filter(p => !p.active);
    if (filter === 'active') return plans.filter(p => p.active);
    if (filter === 'due') {
      return plans.filter(p => {
        if (!p.active || !p.nextDueAt) return false;
        return daysBetween(today(), p.nextDueAt) <= 14;
      });
    }
    return plans;
  }, [plans, filter]);

  const counts = useMemo(() => ({
    all:    plans.length,
    due:    plans.filter(p => p.active && p.nextDueAt && daysBetween(today(), p.nextDueAt) <= 14).length,
    active: plans.filter(p =>  p.active).length,
    paused: plans.filter(p => !p.active).length,
  }), [plans]);

  const handleSavePlan = async (planDraft) => {
    if (persistPlan) await persistPlan(planDraft);
  };

  const handleTogglePause = async (plan) => {
    if (persistPlan) await persistPlan({ ...plan, active: !plan.active });
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.title}"? Existing jobs from this plan will keep but the recurring schedule will stop.`)) return;
    if (removePlan) await removePlan(plan.id);
  };

  const handleSchedule = (plan) => {
    if (onScheduleFromPlan) onScheduleFromPlan(plan);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.025em' }}>Maintenance Plans</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: C.muted, fontWeight: 500 }}>
            {counts.all} plan{counts.all === 1 ? '' : 's'}
            {counts.due > 0 && <> · <strong style={{ color: C.warn }}>{counts.due} due soon</strong></>}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding: '12px 22px', fontSize: 15, fontWeight: 700,
          background: C.green, color: '#fff', border: 'none', borderRadius: 8,
          cursor: 'pointer', minHeight: 46,
          boxShadow: '0 1px 2px rgba(45, 106, 79, 0.25)',
        }}>+ New Plan</button>
      </div>

      {/* Return banner after Stripe Checkout — dismissed on next navigation. */}
      {returnBanner && (
        <div style={{
          marginBottom: 14, padding: '12px 16px',
          background: returnBanner.kind === 'ok' ? C.greenLo : C.warnLo,
          border: `1px solid ${returnBanner.kind === 'ok' ? C.green : C.warn}33`,
          borderRadius: 10, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 13, color: returnBanner.kind === 'ok' ? C.green : C.warn, fontWeight: 600, lineHeight: 1.5 }}>
            {returnBanner.text}
          </div>
          <button onClick={() => setReturnBanner(null)} style={{
            background: 'transparent', border: 'none', color: C.muted,
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
          }}>×</button>
        </div>
      )}

      {/* ── Recurring Revenue Summary ──
          Only renders if any plan has billing terms set OR any
          subscriptions exist. Hides on accounts that only use plans for
          scheduling (no paid contracts), so the screen stays clean for
          those users. */}
      {(hasContractPlans || subscriptions.length > 0) && (
        <div style={{ marginBottom: 20, padding: '18px 22px', background: `linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)`, border: `1px solid ${C.green}33`, borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, marginBottom: 6 }}>
                Recurring Revenue · Service Contracts
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>MRR</div>
                  <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 30, fontWeight: 900, color: C.green, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    ${mrr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>per month</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>ARR</div>
                  <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    ${arr.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>annualized</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Subs</div>
                  <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {subCounts.active}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>customers</div>
                </div>
                {subCounts.past_due > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.error, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Past Due</div>
                    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 800, color: C.error, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {subCounts.past_due}
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>need attention</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Click <strong style={{ color: C.green }}>Enroll Customer</strong> on a priced plan below to send a Stripe Checkout link — Stripe auto-bills the card on file each {hasContractPlans ? 'period' : 'month/year'}.
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'all',    label: 'All',         count: counts.all    },
          { id: 'due',    label: 'Due Soon',    count: counts.due    },
          { id: 'active', label: 'Active',      count: counts.active },
          { id: 'paused', label: 'Paused',      count: counts.paused },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 14px', borderRadius: 50, fontSize: 13, fontWeight: 600,
            background: filter === f.id ? C.green : '#fff',
            color:      filter === f.id ? '#fff'    : C.muted,
            border: filter === f.id ? 'none' : `1px solid ${C.border}`,
            cursor: 'pointer',
          }}>
            {f.label} <span style={{ opacity: 0.7, fontWeight: 700, marginLeft: 4 }}>({f.count})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading && <div style={{ padding: '24px 0', color: C.dim, fontSize: 14, textAlign: 'center' }}>Loading plans…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: '32px 24px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, textAlign: 'center', color: C.muted }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            {filter === 'all' ? 'No maintenance plans yet' : `No plans match the "${filter}" filter`}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
            Set up recurring maintenance for your customers (annual HVAC tune-ups, quarterly inspections, monthly pool service)
            and the system will track when each is due — auto-fill reminders, pre-fill the tech, and link the resulting job
            back to the plan.
          </div>
        </div>
      )}
      {!loading && filtered.map(plan => (
        <PlanRow
          key={plan.id}
          plan={plan}
          subs={subscriptions}
          clients={clients}
          ownerId={user?.id}
          expanded={expandedPlanId === plan.id}
          onToggleExpanded={(id) => setExpandedPlanId(prev => prev === id ? null : id)}
          onEnroll={(p) => { setEnrollPlan(p); setExpandedPlanId(p.id); }}
          onSubsChanged={refreshSubs}
          onEdit={p => setEditing(p)}
          onSchedule={handleSchedule}
          onTogglePause={handleTogglePause}
          onDelete={handleDelete}
        />
      ))}

      {(showNew || editing) && (
        <PlanModal
          initial={editing}
          clients={clients}
          team={team}
          trades={trades}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSave={handleSavePlan}
        />
      )}

      {enrollPlan && (
        <EnrollModal
          plan={enrollPlan}
          clients={clients}
          ownerId={user?.id}
          onClose={() => setEnrollPlan(null)}
          onCreated={refreshSubs}
        />
      )}
    </div>
  );
}
