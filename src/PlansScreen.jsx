import React, { useState, useEffect, useMemo } from "react";
import { listClients } from "./data/clients";
import { useEscapeClose } from "./lib/useEscapeClose";

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
    modal:   { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)' },
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
function PlanRow({ plan, onEdit, onSchedule, onTogglePause, onDelete }) {
  const dueIn = plan.nextDueAt ? daysBetween(today(), plan.nextDueAt) : null;
  const overdue = dueIn !== null && dueIn < 0;
  const dueSoon = dueIn !== null && dueIn >= 0 && dueIn <= 14;

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
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>
          {plan.clientName || 'Unknown client'} · {plan.trade} · {frequencyLabel(plan.frequencyMonths)}
        </div>
        <div style={{ fontSize: 12, color: C.dim }}>
          Last serviced {formatDate(plan.lastServicedAt)} · Next due {formatDate(plan.nextDueAt)}
        </div>
      </div>

      {/* All actions sized to 44px min — iPad-friendly tap targets. */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={() => onSchedule(plan)} style={{
          padding: '11px 16px', minHeight: 44, borderRadius: 6, border: 'none', background: C.green, color: '#fff',
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
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);
  const [showNew,  setShowNew]  = useState(false);
  const [filter,   setFilter]   = useState('all'); // all | due | active | paused

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await listClients();
        if (!cancelled) setClients(c);
      } catch (e) { console.error('clients load', e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

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
    </div>
  );
}
