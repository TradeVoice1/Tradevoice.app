// Founder dashboard — "god view" over every Tradevoice account.
//
// Rendered only for the super-owner account (matthew@thetradevoice.com).
// App.jsx gates the route on user.isSuperOwner; this component does its
// own data-side check via the RPC (NULL response → unauthorized screen)
// in case App.jsx routing ever drifts. Belt + suspenders.
//
// Phase 3 features:
//   • Top tallies: total accounts, active subs, trialing, past_due,
//     canceled, MRR, last-24h activity, trials-expiring-soon
//   • Account table: every signup with email, plan, status, trial
//     days left, seat count, monthly revenue
//   • Click an account row to expand a detail panel (Phase 4 will
//     populate this with the full Stripe subscription timeline; for
//     now it shows the data we already have client-side)
//   • Refresh button to re-fetch without page reload
//
// What's intentionally NOT here yet:
//   • Resubscribe count per customer (needs subscription_events table
//     from Stripe webhook, Phase 4)
//   • TOTP gate (Phase 2)

import React, { useEffect, useMemo, useState } from "react";
import { fetchSuperOwnerData, fetchAccountTimeline, PLAN_PRICES } from "./data/superOwner";

// Mirrors App.jsx's COLORS so the founder view feels native, not a
// bolted-on admin panel. If the main color palette ever shifts, move
// these into a shared lib.
const C = {
  bg:        '#f5f3ee',
  surface:   '#ffffff',
  border:    '#e8e5dc',
  text:      '#1a1a1a',
  muted:     '#6b6b6b',
  dim:       '#9a9a9a',
  green:     '#2d6a4f',
  greenDark: '#1b4332',
  greenLight:'#e8f1ec',
  orange:    '#ea580c',
  blue:      '#2563eb',
  red:       '#dc2626',
  redLight:  '#fef2f2',
  yellow:    '#d97706',
  yellowLight:'#fffbeb',
  success:   '#15803d',
};

// Pretty status badge — matches the visual language used elsewhere in
// the app (small caps, colored pill). Keep statuses lowercase so the
// styling never depends on case.
const StatusBadge = ({ status, isSuperOwner }) => {
  if (isSuperOwner) {
    return <Pill bg={C.greenDark} fg="#fff">Founder</Pill>;
  }
  const map = {
    trialing:  { bg: C.greenLight,  fg: C.green,     label: 'Trialing' },
    active:    { bg: '#dcfce7',     fg: C.success,   label: 'Active' },
    past_due:  { bg: C.yellowLight, fg: C.yellow,    label: 'Past Due' },
    canceled:  { bg: C.redLight,    fg: C.red,       label: 'Canceled' },
    unpaid:    { bg: C.redLight,    fg: C.red,       label: 'Unpaid' },
    incomplete:{ bg: '#f1f5f9',     fg: '#475569',   label: 'Incomplete' },
  };
  const s = map[status] || { bg: '#f1f5f9', fg: '#475569', label: status || '—' };
  return <Pill bg={s.bg} fg={s.fg}>{s.label}</Pill>;
};

const Pill = ({ bg, fg, children }) => (
  <span style={{
    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
    fontSize: 11, fontWeight: 700, background: bg, color: fg,
    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
  }}>{children}</span>
);

// Compact USD formatter. $49.99 instead of $49.99000000000001.
const fmtMoney = (n) => `$${(Math.round((n || 0) * 100) / 100).toFixed(2)}`;
const fmtDate  = (d) => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtRel   = (d) => {
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)      return 'just now';
  if (mins < 60)     return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)      return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)      return `${days}d ago`;
  return fmtDate(d);
};

// One stat tile in the tally row. Compact card with label + big number.
function StatTile({ label, value, sub, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        flex: '1 1 140px', minWidth: 140,
        textAlign: 'left',
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '14px 18px',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent || C.text, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{sub}</div>
      )}
    </button>
  );
}

export default function OwnerDashboard({ user }) {
  const [data, setData] = useState({ accounts: [], summary: null, unauthorized: false });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  // Phase 4 — per-account event timeline. Lazy-loaded when a row
  // expands so we don't fan out N RPC calls just to render a list.
  // Keyed by profile_id so cached timelines survive collapse + re-expand.
  const [timelines, setTimelines] = useState({}); // { profileId: { loading, error, events } }

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const result = await fetchSuperOwnerData();
      setData(result);
    } catch (e) {
      setErr(e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Lazily fetch the timeline when a row first expands. Cached after
  // first fetch (`!timelines[id]` guard) so re-expanding the same row
  // doesn't re-hit the RPC.
  useEffect(() => {
    if (!expandedId) return;
    if (timelines[expandedId]) return;
    setTimelines(prev => ({ ...prev, [expandedId]: { loading: true, error: null, events: [] } }));
    fetchAccountTimeline(expandedId)
      .then(events => setTimelines(prev => ({ ...prev, [expandedId]: { loading: false, error: null, events } })))
      .catch(e => setTimelines(prev => ({ ...prev, [expandedId]: { loading: false, error: e?.message || 'Failed to load timeline.', events: [] } })));
  }, [expandedId]);

  // Filter + search the accounts table. Search matches email/name/company
  // case-insensitively; status filter is a hard equality.
  const visibleAccounts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.accounts.filter(a => {
      if (filterStatus !== 'all' && a.subscriptionStatus !== filterStatus && !(filterStatus === 'founder' && a.isSuperOwner)) return false;
      if (filterStatus === 'founder' && !a.isSuperOwner) return false;
      if (!needle) return true;
      return (a.email + ' ' + a.name + ' ' + a.company).toLowerCase().includes(needle);
    });
  }, [data.accounts, search, filterStatus]);

  // Guard: if the RPC returned NULL (caller isn't actually super_owner),
  // render a clean unauthorized state instead of a broken dashboard.
  if (data.unauthorized) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>Access denied</div>
        <div style={{ fontSize: 14, color: C.muted }}>
          The founder dashboard is restricted to the super-owner account. If you believe you should have access, double-check that <code>is_super_owner</code> is set on your profile in Supabase.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 24px 80px', maxWidth: 1400, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
            Founder
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>
            Tradevoice Control Room
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Every account on Tradevoice, signed in as {user?.email || 'founder'}.
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 18px', borderRadius: 8,
            background: C.green, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div style={{ background: C.redLight, border: `1px solid #fecaca`, color: C.red, padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {err}
        </div>
      )}

      {/* Tally row */}
      {data.summary && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <StatTile
              label="Total Accounts"
              value={data.summary.totalAccounts}
              sub={`${data.summary.customerCount} customer${data.summary.customerCount === 1 ? '' : 's'} + you`}
            />
            <StatTile
              label="Active Subs"
              value={data.summary.activeCount}
              accent={data.summary.activeCount > 0 ? C.success : C.text}
              onClick={() => setFilterStatus('active')}
            />
            <StatTile
              label="Trialing"
              value={data.summary.trialingCount}
              accent={data.summary.trialingCount > 0 ? C.green : C.text}
              sub={data.summary.trialsExpiringSoon > 0 ? `${data.summary.trialsExpiringSoon} expiring within 7 days` : null}
              onClick={() => setFilterStatus('trialing')}
            />
            <StatTile
              label="Past Due"
              value={data.summary.pastDueCount}
              accent={data.summary.pastDueCount > 0 ? C.yellow : C.text}
              onClick={() => setFilterStatus('past_due')}
            />
            <StatTile
              label="Canceled"
              value={data.summary.canceledCount}
              accent={data.summary.canceledCount > 0 ? C.red : C.text}
              onClick={() => setFilterStatus('canceled')}
            />
            <StatTile
              label="MRR"
              value={fmtMoney(data.summary.monthlyRevenue)}
              accent={C.green}
              sub="Active subs only"
            />
          </div>

          {/* Activity strip */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '12px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', fontSize: 13,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>
              Last 24 hours
            </div>
            <div>
              <span style={{ fontWeight: 800, color: C.text }}>{data.summary.newSignups24h}</span>
              <span style={{ color: C.muted, marginLeft: 6 }}>new signup{data.summary.newSignups24h === 1 ? '' : 's'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 800, color: C.text }}>{data.summary.recentSignins24h}</span>
              <span style={{ color: C.muted, marginLeft: 6 }}>recent sign-in{data.summary.recentSignins24h === 1 ? '' : 's'}</span>
            </div>
          </div>
        </>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by email, name, or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px', minWidth: 200, padding: '10px 14px',
            border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8,
            fontSize: 14, background: C.surface, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="founder">Founder</option>
        </select>
      </div>

      {/* Account table */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading && data.accounts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading accounts…</div>
        ) : visibleAccounts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
            {search || filterStatus !== 'all' ? 'No accounts match this filter.' : 'No accounts yet — first real signup will land here.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafaf7', borderBottom: `1px solid ${C.border}` }}>
                  <th style={th}>Email</th>
                  <th style={th}>Name / Company</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'center' }}>Trial Left</th>
                  <th style={{ ...th, textAlign: 'center' }}>Seats</th>
                  <th style={{ ...th, textAlign: 'right' }}>Monthly</th>
                  <th style={th}>Last Sign-In</th>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map(a => {
                  const expanded = expandedId === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <tr
                        onClick={() => setExpandedId(expanded ? null : a.id)}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          cursor: 'pointer',
                          background: expanded ? '#fafaf7' : 'transparent',
                        }}
                      >
                        <td style={td}>
                          <span style={{ fontWeight: 700, color: C.text }}>{a.email}</span>
                        </td>
                        <td style={td}>
                          <div style={{ color: C.text, fontWeight: 500 }}>{a.name || '—'}</div>
                          {a.company && <div style={{ color: C.muted, fontSize: 12 }}>{a.company}</div>}
                        </td>
                        <td style={td}>
                          {a.plan ? <Pill bg="#eff6ff" fg="#1d4ed8">{a.plan}</Pill> : <span style={{ color: C.dim }}>—</span>}
                        </td>
                        <td style={td}>
                          <StatusBadge status={a.subscriptionStatus} isSuperOwner={a.isSuperOwner} />
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {a.isSuperOwner ? '—' : (a.subscriptionStatus === 'trialing'
                            ? <span style={{
                                fontWeight: 700,
                                color: a.trialDaysLeft != null && a.trialDaysLeft <= 7 ? C.red : C.text,
                              }}>{a.trialDaysLeft != null ? `${a.trialDaysLeft}d` : '—'}</span>
                            : <span style={{ color: C.dim }}>—</span>)}
                        </td>
                        <td style={{ ...td, textAlign: 'center', color: C.text, fontWeight: 700 }}>
                          {a.activeSeats}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: a.monthlyRevenue > 0 ? C.success : C.dim, fontWeight: 700 }}>
                          {a.monthlyRevenue > 0 ? fmtMoney(a.monthlyRevenue) : '—'}
                        </td>
                        <td style={{ ...td, color: C.muted }}>
                          {fmtRel(a.lastSignInAt)}
                        </td>
                      </tr>
                      {expanded && (
                        <tr style={{ background: '#fafaf7', borderBottom: `1px solid ${C.border}` }}>
                          <td colSpan={8} style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                              <DetailField label="Signed Up"  value={fmtDate(a.createdAt)} />
                              <DetailField label="Trial Ends" value={a.isSuperOwner ? '—' : fmtDate(a.trialEndsAt)} />
                              <DetailField label="Last Sign-In" value={fmtDate(a.lastSignInAt)} />
                              <DetailField label="Card on File" value={a.hasCard ? 'Yes' : 'No'} />
                              <DetailField label="Stripe Customer" value={a.stripeCustomerId || '—'} mono />
                              <DetailField label="Subscription ID" value={a.stripeSubscriptionId || '—'} mono />
                              <DetailField label="Plan Price"  value={a.plan ? fmtMoney(PLAN_PRICES[a.plan] || 0) : '—'} />
                              <DetailField label="Active Seats" value={a.activeSeats} />
                            </div>
                            {/* Phase 4 — subscription event timeline */}
                            <Timeline state={timelines[a.id]} fallbackCreatedAt={a.createdAt} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Per-account subscription event timeline. Renders inside the
// expanded row. Loading / error / empty states are all distinct so
// the contractor (well, you, when looking at this) can tell whether
// the RPC actually returned no events vs. is still loading vs.
// errored. When events ARE present they render newest-first as a
// vertical timeline with colored dots per event type.
function Timeline({ state, fallbackCreatedAt }) {
  if (!state || state.loading) {
    return (
      <div style={{ marginTop: 14, fontSize: 12, color: C.dim, fontStyle: 'italic' }}>
        Loading timeline…
      </div>
    );
  }
  if (state.error) {
    return (
      <div style={{ marginTop: 14, fontSize: 13, color: C.red, background: C.redLight, padding: 10, borderRadius: 6 }}>
        {state.error}
      </div>
    );
  }
  const events = state.events || [];
  if (events.length === 0) {
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
          Subscription Timeline
        </div>
        <div style={{ fontSize: 12, color: C.dim, fontStyle: 'italic' }}>
          No subscription events recorded yet{fallbackCreatedAt ? ` (account created ${fallbackCreatedAt.toLocaleDateString('en-US')})` : ''}. Future Stripe webhook events will land here automatically.
        </div>
      </div>
    );
  }

  // Color + label per event type — keeps the timeline scannable.
  const meta = {
    subscription_created:  { dot: '#2563eb', label: 'Subscription Created' },
    subscription_updated:  { dot: '#6b7280', label: 'Subscription Updated' },
    subscription_canceled: { dot: '#dc2626', label: 'Subscription Canceled' },
    payment_succeeded:     { dot: '#15803d', label: 'Payment Succeeded' },
    payment_failed:        { dot: '#d97706', label: 'Payment Failed' },
    account_created:       { dot: '#2d6a4f', label: 'Account Created' },
    trial_ending:          { dot: '#d97706', label: 'Trial Ending' },
    resubscribed:          { dot: '#2563eb', label: 'Resubscribed' },
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b6b6b', marginBottom: 10 }}>
        Subscription Timeline · {events.length} event{events.length === 1 ? '' : 's'}
      </div>
      <div style={{ position: 'relative', paddingLeft: 18 }}>
        {/* Vertical line connecting the dots */}
        <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: '#e5e7eb' }} />
        {events.map(ev => {
          const m = meta[ev.eventType] || { dot: '#9ca3af', label: ev.eventType };
          return (
            <div key={ev.id} style={{ position: 'relative', paddingBottom: 12, fontSize: 13 }}>
              <div style={{
                position: 'absolute', left: -18, top: 4,
                width: 12, height: 12, borderRadius: '50%',
                background: m.dot, border: '2px solid #fff',
                boxShadow: '0 0 0 1px #e5e7eb',
              }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{m.label}</span>
                {ev.status && (
                  <span style={{ fontSize: 11, color: '#6b6b6b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                    {ev.status}
                  </span>
                )}
                {ev.amount != null && ev.amount > 0 && (
                  <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>
                    ${ev.amount.toFixed(2)}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9a9a9a' }}>
                  {ev.occurredAt ? ev.occurredAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                </span>
              </div>
              {ev.stripeSubscriptionId && (
                <div style={{ fontSize: 11, color: '#9a9a9a', marginTop: 2, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                  {ev.stripeSubscriptionId}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const th = {
  textAlign: 'left', padding: '12px 14px',
  fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: C.muted,
};
const td = { padding: '14px 14px', verticalAlign: 'top' };

function DetailField({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, fontFamily: mono ? "ui-monospace, 'SF Mono', Menlo, monospace" : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  );
}
