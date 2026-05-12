import React, { useState, useEffect, useMemo } from "react";
import { listClients } from "./data/clients";
import {
  listCampaigns, listRecentSends,
  sendReviewRequests, sendCampaign, setClientReviewed,
} from "./data/marketing";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const C = {
  green: '#2d6a4f',
  greenLight: '#f0f7f4',
  greenBorder: '#a7d9be',
};

// Static automation library — these are templates the user can read about
// today, but toggling them is INERT in Phase 1. Real triggers need a
// scheduled background job (Vercel Cron) which is a Phase 2 task.
const AUTOMATIONS_PREVIEW = [
  { id: 1, name: 'Review Request',              trigger: 'Job marked complete',     delay: '1 day after' },
  { id: 2, name: 'Quote Follow-up',             trigger: 'Quote sent, not accepted', delay: '3 days after' },
  { id: 3, name: 'Annual Maintenance Reminder', trigger: '1 year after last job',    delay: '12 months after' },
  { id: 4, name: 'Thank You + Referral Ask',    trigger: 'Invoice paid',             delay: '2 days after' },
];

// Lightweight "time ago" helper — keeps the activity feed readable without
// pulling in date-fns.
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return 'just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

const TRADE_OPTIONS = ['All', 'Plumber', 'HVAC', 'Electrician', 'Roofing', 'Specialty'];

// ─── REVIEW REQUEST MODAL ─────────────────────────────────────────────────────
function ReviewRequestModal({ clients, ownerId, reviewLink, onClose, onSent }) {
  const [selected, setSelected]     = useState([]);
  const [sending,  setSending]      = useState(false);
  const [result,   setResult]       = useState(null);  // { sentCount, failedCount }
  const [error,    setError]        = useState('');

  // Show clients that don't yet have a review marked. Sort with the
  // most-recent jobs first so the contractor sees their freshest work
  // (best chance of a glowing review while it's fresh in memory).
  const eligible = useMemo(
    () => (clients || []).filter(c => !c.reviewedAt && c.email),
    [clients]
  );

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSend = async () => {
    if (sending || selected.length === 0) return;
    setSending(true);
    setError('');
    try {
      const r = await sendReviewRequests({
        ownerId,
        clientIds: selected,
        reviewLink: reviewLink || null,
      });
      setResult(r);
      if (onSent) await onSent();
    } catch (e) {
      setError(e?.message || 'Could not send review requests.');
    } finally {
      setSending(false);
    }
  };

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: C.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body: { padding: '20px 24px' },
    clientRow: (sel) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, border: `1px solid ${sel ? C.greenBorder : '#e8e8e8'}`, background: sel ? C.greenLight : '#fff', cursor: 'pointer', marginBottom: 8 }),
    checkbox: (sel) => ({ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? C.green : '#ddd'}`, background: sel ? C.green : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
    footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary, disabled) => ({ flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : '1px solid #ddd', background: primary ? C.green : '#fff', color: primary ? '#fff' : '#666', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }),
  };

  if (result) {
    return (
      <div style={s.overlay}>
        <div style={{ ...s.modal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111', marginBottom: 8 }}>
            {result.sentCount} review request{result.sentCount === 1 ? '' : 's'} sent
          </div>
          {result.failedCount > 0 && (
            <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 12 }}>
              {result.failedCount} couldn't be sent (check the client's email address)
            </div>
          )}
          <button style={{ ...s.btn(true, false), flex: 'none', minWidth: 160 }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Send Review Requests</span>
          <button style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }} onClick={onClose}>×</button>
        </div>
        <div style={s.body}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Select clients to email. Only clients with an email address who haven't been marked reviewed are shown.
          </div>
          <div style={{ background: '#f7f7f5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#555', lineHeight: 1.6 }}>
            <strong>Preview:</strong> "Hi [FirstName], thanks for choosing {`{your company}`}. If you had a great experience, would you take 30 seconds to leave a Google review? It really helps."
            {!reviewLink && (
              <div style={{ marginTop: 8, color: '#b45309', fontSize: 12 }}>
                ⚠ No Google review link set in Settings yet — the email will go without one. Add yours in Settings → Profile.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
              {eligible.length} client{eligible.length === 1 ? '' : 's'} eligible
            </span>
            {eligible.length > 0 && (
              <button style={{ background: 'none', border: 'none', color: C.green, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelected(eligible.map(c => c.id))}>
                Select all
              </button>
            )}
          </div>
          {eligible.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: 14, background: '#fafafa', borderRadius: 8 }}>
              Every client with an email on file has been reviewed (or doesn't have an email).
            </div>
          )}
          {eligible.map(client => {
            const sel = selected.includes(client.id);
            return (
              <div key={client.id} style={s.clientRow(sel)} onClick={() => toggleSelect(client.id)}>
                <div style={s.checkbox(sel)}>{sel && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{client.name}</div>
                  <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client.email}
                    {client.reviewRequestedAt && <> · last asked {timeAgo(client.reviewRequestedAt)}</>}
                  </div>
                </div>
              </div>
            );
          })}
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#b91c1c', lineHeight: 1.5 }}>
              {error}
            </div>
          )}
        </div>
        <div style={s.footer}>
          <button style={s.btn(false, false)} onClick={onClose} disabled={sending}>Cancel</button>
          <button style={s.btn(true, !selected.length || sending)} onClick={handleSend} disabled={!selected.length || sending}>
            {sending ? 'Sending…' : `Send to ${selected.length} Client${selected.length !== 1 ? 's' : ''} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NEW CAMPAIGN MODAL ───────────────────────────────────────────────────────
function NewCampaignModal({ ownerId, onClose, onSent }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', trade: 'All', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState(null);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const TEMPLATES = [
    { id: 1, name: 'Spring AC Tune-Up',     trade: 'HVAC',     subject: "Time for your spring AC tune-up!",                message: "Hi [FirstName],\n\nSpring is here and it's the perfect time to make sure your AC is ready for summer. We're offering a special spring tune-up service — catch problems early before the heat kicks in.\n\nReply or call to schedule your appointment.\n\nThanks,\n[Company]" },
    { id: 2, name: 'Annual Plumbing Check', trade: 'Plumber',  subject: "Is your plumbing ready for the year ahead?",      message: "Hi [FirstName],\n\nIt's been a while since we last serviced your plumbing. A quick annual checkup can catch small problems before they become big ones.\n\nReply or call to schedule — we'll take care of you.\n\n[Company]" },
    { id: 3, name: 'Roof Storm Check',      trade: 'Roofing',  subject: "Has recent storm weather affected your roof?",    message: "Hi [FirstName],\n\nRecent storms in the area can cause roof damage that isn't always visible from the ground. We're offering free post-storm inspections this month.\n\nDon't wait until a small issue becomes a big leak. Reply or call to book your free inspection.\n\n[Company]" },
    { id: 4, name: 'Referral Request',      trade: 'All',      subject: "Know someone who needs a great contractor?",      message: "Hi [FirstName],\n\nWe loved working with you. If you know anyone who needs a reliable contractor, we'd really appreciate the referral.\n\nAs a thank you, we'll give you $25 off your next service for every referral that books with us.\n\nThanks so much,\n[Company]" },
  ];

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: C.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body: { padding: '20px 24px' },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block', marginTop: 14 },
    input: { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    select: { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' },
    textarea: { width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', height: 160, resize: 'vertical', lineHeight: 1.7 },
    templateCard: (active) => ({ padding: '14px', border: `1px solid ${active ? C.green : '#e8e8e8'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 10, background: active ? C.greenLight : '#fff' }),
    footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary, disabled) => ({ flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : '1px solid #ddd', background: primary ? C.green : '#fff', color: primary ? '#fff' : '#666', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }),
  };

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const r = await sendCampaign({
        ownerId,
        name: form.name || form.subject || 'Untitled campaign',
        tradeFilter: form.trade,
        subject: form.subject,
        message: form.message,
      });
      setResult(r);
      if (onSent) await onSent();
    } catch (e) {
      setError(e?.message || 'Could not send campaign.');
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <div style={s.overlay}>
        <div style={{ ...s.modal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111', marginBottom: 8 }}>
            Campaign sent
          </div>
          <div style={{ fontSize: 15, color: '#666', marginBottom: 12 }}>
            Delivered to {result.sentCount} client{result.sentCount === 1 ? '' : 's'}
            {result.failedCount > 0 && <span style={{ color: '#b91c1c' }}> · {result.failedCount} failed</span>}.
          </div>
          {result.sentCount === 0 && result.detail === 'no_matching_clients' && (
            <div style={{ fontSize: 13, color: '#b45309', marginBottom: 12, padding: '10px 14px', background: '#fef9c3', borderRadius: 8 }}>
              No clients matched the "{form.trade}" filter. Try "All Clients" or add jobs first.
            </div>
          )}
          <button style={{ ...s.btn(true, false), flex: 'none', minWidth: 160 }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{step === 1 ? 'Choose a Template' : 'Customize Campaign'}</span>
          <button style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }} onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div style={s.body}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Pick a starting template or start from scratch.</div>
            {TEMPLATES.map(t => (
              <div key={t.id} style={s.templateCard(form.name === t.name)} onClick={() => { update('name', t.name); update('subject', t.subject); update('message', t.message); update('trade', t.trade); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{t.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenLight, padding: '2px 8px', borderRadius: 4 }}>{t.trade}</span>
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>{t.subject}</div>
              </div>
            ))}
            <div style={s.templateCard(form.name === 'custom')} onClick={() => { update('name', 'custom'); update('subject', ''); update('message', ''); }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Start from scratch</div>
              <div style={{ fontSize: 13, color: '#888' }}>Write your own subject and message</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={s.body}>
            <label style={s.label}>Campaign Name</label>
            <input style={s.input} value={form.name === 'custom' ? '' : form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Spring HVAC Special" />
            <label style={s.label}>Send To</label>
            <select style={s.select} value={form.trade} onChange={e => update('trade', e.target.value)}>
              {TRADE_OPTIONS.map(t => (
                <option key={t} value={t}>{t === 'All' ? 'All Clients' : `${t} Clients Only`}</option>
              ))}
            </select>
            <label style={s.label}>Email Subject</label>
            <input style={s.input} value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="Subject line..." />
            <label style={s.label}>Message</label>
            <textarea style={s.textarea} value={form.message} onChange={e => update('message', e.target.value)} placeholder="Write your message here. Use [FirstName] and [Company] to personalize." />
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
              Tokens: <code>[FirstName]</code> · <code>[Name]</code> · <code>[Company]</code>
            </div>
            {error && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#b91c1c', lineHeight: 1.5 }}>
                {error}
              </div>
            )}
          </div>
        )}

        <div style={s.footer}>
          {step === 2 ? (
            <>
              <button style={s.btn(false, sending)} onClick={() => setStep(1)} disabled={sending}>← Back</button>
              <button
                style={s.btn(true, sending || !form.subject || !form.message)}
                onClick={handleSend}
                disabled={sending || !form.subject || !form.message}
              >
                {sending ? 'Sending…' : 'Send Campaign'}
              </button>
            </>
          ) : (
            <>
              <button style={s.btn(false, false)} onClick={onClose}>Cancel</button>
              <button style={s.btn(true, !form.name)} onClick={() => setStep(2)} disabled={!form.name}>Continue →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVITY FEED ITEM ICON ──────────────────────────────────────────────────
function iconForSendType(type, status) {
  if (status === 'failed') return { icon: '⚠', color: '#dc2626' };
  switch (type) {
    case 'review_request': return { icon: '⭐', color: '#f59e0b' };
    case 'campaign':       return { icon: '📧', color: C.green };
    case 'automation':     return { icon: '⚡', color: '#8b5cf6' };
    case 'reminder':       return { icon: '🔔', color: '#3b82f6' };
    default:               return { icon: '📨', color: '#6b7280' };
  }
}

// ─── MAIN MARKETING SCREEN ────────────────────────────────────────────────────
//
// Receives `user` (the owner profile) and `clients` (real list from
// Supabase) as props. Falls back to safe empty arrays if the route is
// hit before App.jsx finishes hydrating.
//
// Loads campaigns + recent sends on mount via the marketing data layer.
// All sends go through /api/marketing/* endpoints which use the
// Resend integration on the server.
export default function MarketingScreen({ user }) {
  const ownerId    = user?.id;
  const reviewLink = user?.reviewLink || user?.googleReviewLink || null;

  const [tab, setTab]                 = useState('overview'); // overview | reviews | campaigns | automations | clients
  const [clients,   setClients]       = useState([]);
  const [campaigns, setCampaigns]     = useState([]);
  const [recentSends, setRecentSends] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showReviewModal, setShowReviewModal]     = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // Hydrate clients + campaign list + send log on mount (and whenever a send
  // completes — refreshAll() is passed into the modals' onSent prop). All
  // three are scoped to the signed-in owner via RLS, so a single fetch
  // per screen entry is fine — no cross-component state sharing needed.
  const refreshAll = async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    try {
      const [cl, c, s] = await Promise.all([
        listClients().catch(() => []),
        listCampaigns().catch(() => []),
        listRecentSends(50).catch(() => []),
      ]);
      setClients(cl);
      setCampaigns(c);
      setRecentSends(s);
    } catch (e) {
      console.error('marketing load', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAll(); }, [ownerId]);

  // Derived counts. Use real clients + sends — no more hardcoded stubs.
  const totalClients   = clients.length;
  const reviewedCount  = clients.filter(c => c.reviewedAt).length;
  const pendingReviews = totalClients - reviewedCount;
  const totalCampaignsSent = campaigns.filter(c => c.status === 'sent').length;

  const handleToggleReviewed = async (client) => {
    const next = !client.reviewedAt;
    // Optimistic — flip locally, then persist. Revert on failure.
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, reviewedAt: next ? new Date().toISOString() : null } : c));
    try {
      await setClientReviewed(client.id, next);
    } catch (e) {
      alert(e?.message || 'Could not update review status.');
      setClients(prev => prev.map(c => c.id === client.id ? client : c));
    }
  };

  const s = {
    wrap: { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 800, color: '#111' },
    tabs: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto' },
    tab: (active) => ({ padding: '12px 16px', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? C.green : '#888', cursor: 'pointer', whiteSpace: 'nowrap', background: 'none', border: 'none', borderBottom: `2px solid ${active ? C.green : 'transparent'}` }),
    body: { padding: '24px 20px', maxWidth: 900, margin: '0 auto' },
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
    statCard: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '20px', textAlign: 'center' },
    statNum: { fontSize: 32, fontWeight: 900, color: '#111', marginBottom: 4 },
    statLabel: { fontSize: 13, color: '#888' },
    card: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginBottom: 20 },
    cardHeader: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: 700, color: '#111' },
    tableHead: { display: 'grid', padding: '10px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#aaa', background: '#fafafa', borderBottom: '1px solid #f0f0f0' },
    tableRow: { display: 'grid', padding: '14px 20px', borderBottom: '1px solid #f8f8f8', alignItems: 'center' },
    badge: (color, bg) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, color, background: bg }),
    emptyState: { padding: '40px 20px', textAlign: 'center', color: '#888', fontSize: 14, background: '#fff' },
  };

  // ── Guard: signed-out / not-yet-loaded ────────────────────────────────────
  if (!ownerId) {
    return (
      <div style={s.wrap}>
        <div style={s.header}><div style={s.title}>Marketing</div></div>
        <div style={s.body}>
          <div style={s.emptyState}>Sign in to view marketing tools.</div>
        </div>
      </div>
    );
  }

  // ── Activity feed entry rendering ─────────────────────────────────────────
  const renderActivityRow = (entry, i) => {
    const meta = iconForSendType(entry.type, entry.status);
    const verb = entry.type === 'review_request' ? 'Review request' :
                 entry.type === 'campaign'       ? 'Campaign' :
                 entry.type === 'automation'     ? 'Automation' : 'Email';
    const target = entry.recipientName || entry.recipientEmail;
    const failNote = entry.status === 'failed' ? ' — failed' : '';
    return (
      <div key={entry.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f8f8f8' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{meta.icon}</div>
        <div style={{ flex: 1, fontSize: 14, color: '#333', minWidth: 0 }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {verb} sent to <strong>{target}</strong>{failNote}
          </div>
          {entry.subject && (
            <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry.subject}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>{timeAgo(entry.createdAt)}</div>
      </div>
    );
  };

  const renderOverview = () => (
    <>
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <div style={s.statNum}>{reviewedCount}</div>
          <div style={s.statLabel}>Reviews Logged</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: pendingReviews > 0 ? '#f59e0b' : '#10b981' }}>{pendingReviews}</div>
          <div style={s.statLabel}>Pending Reviews</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{totalCampaignsSent}</div>
          <div style={s.statLabel}>Campaigns Sent</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: C.green }}>{recentSends.length}</div>
          <div style={s.statLabel}>Recent Sends (30d)</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '⭐', title: 'Request Reviews', desc: pendingReviews > 0 ? `${pendingReviews} clients haven't reviewed yet` : 'Ask happy customers for Google reviews', action: () => setShowReviewModal(true), btnText: 'Send Requests' },
          { icon: '📧', title: 'New Campaign',    desc: 'Send a promotion to your clients',                                                                                              action: () => setShowCampaignModal(true), btnText: 'Create Campaign' },
          { icon: '⚡', title: 'Automations',     desc: 'Trigger-based sends (coming soon)',                                                                                              action: () => setTab('automations'), btnText: 'View' },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '20px' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>{item.desc}</div>
            <button style={{ padding: '9px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }} onClick={item.action}>{item.btnText}</button>
          </div>
        ))}
      </div>

      {/* Recent Activity — REAL DATA from marketing_sends. */}
      <div style={s.card}>
        <div style={s.cardHeader}><span style={s.cardTitle}>Recent Activity</span></div>
        {loading && <div style={s.emptyState}>Loading activity…</div>}
        {!loading && recentSends.length === 0 && (
          <div style={s.emptyState}>Nothing sent yet. Try a review request or campaign above.</div>
        )}
        {!loading && recentSends.slice(0, 6).map(renderActivityRow)}
      </div>
    </>
  );

  const renderReviews = () => {
    const reviewedList = clients.filter(c => c.reviewedAt);
    const pendingList  = clients.filter(c => !c.reviewedAt);
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>⭐</div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: C.green }}>{reviewedList.length}</div>
              <div style={{ fontSize: 14, color: C.green }}>Reviews logged</div>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b' }}>{pendingList.length}</div>
              <div style={{ fontSize: 14, color: '#888' }}>Pending</div>
            </div>
            <button style={{ padding: '10px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowReviewModal(true)}>
              Request Reviews
            </button>
          </div>
        </div>
        <div style={s.card}>
          <div style={{ ...s.tableHead, gridTemplateColumns: '1.5fr 1.5fr 120px 120px' }}>
            <span>Client</span><span>Email</span><span>Last Asked</span><span>Status</span>
          </div>
          {clients.length === 0 && (
            <div style={s.emptyState}>No clients yet. Add clients in the Clients screen to start asking for reviews.</div>
          )}
          {clients.map(c => (
            <div key={c.id} style={{ ...s.tableRow, gridTemplateColumns: '1.5fr 1.5fr 120px 120px' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>{c.company || c.phone}</div>
              </div>
              <div style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.email || <span style={{ color: '#aaa' }}>—</span>}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {c.reviewRequestedAt ? timeAgo(c.reviewRequestedAt) : '—'}
              </div>
              <div>
                <button
                  onClick={() => handleToggleReviewed(c)}
                  style={{
                    border: 'none', cursor: 'pointer',
                    ...s.badge(c.reviewedAt ? '#166534' : '#b45309', c.reviewedAt ? '#dcfce7' : '#fef9c3'),
                  }}
                  title={c.reviewedAt ? 'Click to unmark' : 'Click to mark as reviewed'}
                >
                  {c.reviewedAt ? '⭐ Done' : 'Mark done'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderCampaigns = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={{ padding: '10px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowCampaignModal(true)}>
          + New Campaign
        </button>
      </div>
      <div style={s.card}>
        <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1fr 80px 1fr 100px' }}>
          <span>Campaign</span><span>Date</span><span>Sent</span><span>Trade</span><span>Status</span>
        </div>
        {loading && <div style={s.emptyState}>Loading campaigns…</div>}
        {!loading && campaigns.length === 0 && (
          <div style={s.emptyState}>No campaigns yet. Click <strong>+ New Campaign</strong> above to send your first one.</div>
        )}
        {!loading && campaigns.map(c => (
          <div key={c.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr 80px 1fr 100px' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.subject}</div>
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : new Date(c.createdAt).toLocaleDateString()}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{c.sentCount}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{c.tradeFilter || 'All'}</div>
            <div>
              {c.status === 'sent'     && <span style={s.badge('#166534', '#dcfce7')}>Sent</span>}
              {c.status === 'draft'    && <span style={s.badge('#6b7280', '#f3f4f6')}>Draft</span>}
              {c.status === 'sending'  && <span style={s.badge('#1d4ed8', '#eff6ff')}>Sending…</span>}
              {c.status === 'failed'   && <span style={s.badge('#b91c1c', '#fef2f2')}>Failed</span>}
              {c.status === 'scheduled'&& <span style={s.badge('#1d4ed8', '#eff6ff')}>Scheduled</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderAutomations = () => (
    <>
      <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#854d0e', lineHeight: 1.6 }}>
        ⏳ <strong>Coming soon.</strong> Trigger-based automations (e.g. "invoice paid → wait 2 days → send review request") need a scheduled background job. We'll add this once Vercel Cron is wired. For now, use <strong>Request Reviews</strong> or <strong>New Campaign</strong> for manual sends.
      </div>
      <div style={s.card}>
        {AUTOMATIONS_PREVIEW.map(auto => (
          <div key={auto.id} style={{ padding: '18px 20px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{auto.name}</span>
                <span style={s.badge('#6b7280', '#f3f4f6')}>paused</span>
              </div>
              <div style={{ fontSize: 13, color: '#888' }}>
                Trigger: <strong style={{ color: '#555' }}>{auto.trigger}</strong> · Sends: <strong style={{ color: '#555' }}>{auto.delay}</strong>
              </div>
            </div>
            <button disabled style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: '#f3f4f6', color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'not-allowed' }}>
              Not yet
            </button>
          </div>
        ))}
      </div>
    </>
  );

  const renderClients = () => (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <span style={s.cardTitle}>All Clients — {clients.length}</span>
      </div>
      <div style={{ ...s.tableHead, gridTemplateColumns: '1.5fr 1.5fr 1fr 100px' }}>
        <span>Client</span><span>Email</span><span>Phone</span><span>Reviewed</span>
      </div>
      {clients.length === 0 && (
        <div style={s.emptyState}>No clients yet. Add some in the Clients screen.</div>
      )}
      {clients.map(c => (
        <div key={c.id} style={{ ...s.tableRow, gridTemplateColumns: '1.5fr 1.5fr 1fr 100px' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{c.name}</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>{c.company || '—'}</div>
          </div>
          <div style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '—'}</div>
          <div style={{ fontSize: 13, color: '#666' }}>{c.phone || '—'}</div>
          <div>
            {c.reviewedAt
              ? <span style={s.badge('#166534', '#dcfce7')}>⭐</span>
              : <span style={{ ...s.badge('#b45309', '#fef9c3'), cursor: 'pointer' }} onClick={() => setShowReviewModal(true)}>Ask</span>
            }
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.title}>Marketing</div>
        <div style={{ fontSize: 13, color: '#888' }}>Grow your business with reviews & campaigns</div>
      </div>

      <div style={s.tabs}>
        {[
          { id: 'overview',    label: 'Overview' },
          { id: 'reviews',     label: `Reviews (${reviewedCount})` },
          { id: 'campaigns',   label: 'Campaigns' },
          { id: 'automations', label: 'Automations' },
          { id: 'clients',     label: `Clients (${totalClients})` },
        ].map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={s.body}>
        {tab === 'overview'    && renderOverview()}
        {tab === 'reviews'     && renderReviews()}
        {tab === 'campaigns'   && renderCampaigns()}
        {tab === 'automations' && renderAutomations()}
        {tab === 'clients'     && renderClients()}
      </div>

      {showReviewModal && (
        <ReviewRequestModal
          clients={clients}
          ownerId={ownerId}
          reviewLink={reviewLink}
          onClose={() => setShowReviewModal(false)}
          onSent={refreshAll}
        />
      )}
      {showCampaignModal && (
        <NewCampaignModal
          ownerId={ownerId}
          onClose={() => setShowCampaignModal(false)}
          onSent={refreshAll}
        />
      )}
    </div>
  );
}
