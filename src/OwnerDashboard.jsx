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
import { useBreakpoint } from "./lib/useBreakpoint";

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
const StatusBadge = ({ status, isSuperOwner, isCanceling }) => {
  if (isSuperOwner) {
    return <Pill bg={C.greenDark} fg="#fff">Founder</Pill>;
  }
  // Canceling beats the underlying status pill — "Active · Canceling" is
  // the high-signal state. Once status flips to 'canceled' (period
  // ended), this branch no longer fires; we fall through to the red
  // 'Canceled' pill below.
  if (isCanceling) {
    return <Pill bg={C.yellowLight} fg={C.yellow}>Canceling</Pill>;
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
    fontSize: 13, fontWeight: 700, background: bg, color: fg,
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
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || C.text, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 14, color: C.dim, marginTop: 6 }}>{sub}</div>
      )}
    </button>
  );
}

export default function OwnerDashboard({ user }) {
  const { isPhone } = useBreakpoint();
  const [data, setData] = useState({ accounts: [], summary: null, unauthorized: false });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  // Sort state — defaults to alphabetical-by-name ascending because
  // that's the easiest way to FIND a specific contractor. Click any
  // table header to flip the sort; click the active header again to
  // reverse direction. The RPC returns newest-first, so we re-sort
  // client-side regardless of how the data arrived.
  const [sortBy,  setSortBy]  = useState('name');
  const [sortDir, setSortDir] = useState('asc');
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
    const filtered = data.accounts.filter(a => {
      if (filterStatus !== 'all') {
        // "canceling" and "founder" are pseudo-statuses derived from
        // flags rather than literal subscription_status values, so
        // they need their own branches before the equality check below.
        if (filterStatus === 'canceling') {
          if (!a.isCanceling) return false;
        } else if (filterStatus === 'founder') {
          if (!a.isSuperOwner) return false;
        } else if (a.subscriptionStatus !== filterStatus) {
          return false;
        }
      }
      if (!needle) return true;
      return (a.email + ' ' + a.name + ' ' + a.company).toLowerCase().includes(needle);
    });

    // Pull the sortable value for the active sort column. Strings are
    // localeCompare'd (so 'a' < 'b' < 'á' ranks naturally); numbers/
    // dates use numeric subtraction. Null/empty values always sort
    // LAST regardless of direction so a contractor missing a field
    // doesn't end up at the top of an A→Z list.
    const valueOf = (a) => {
      switch (sortBy) {
        case 'name':       return (a.name || '').toLowerCase();
        case 'company':    return (a.company || '').toLowerCase();
        case 'email':      return (a.email || '').toLowerCase();
        case 'plan':       return (a.plan || '').toLowerCase();
        case 'status':     return a.isCanceling ? 'canceling' : (a.subscriptionStatus || '');
        case 'trial':      return a.trialDaysLeft ?? -Infinity;
        case 'seats':      return a.activeSeats ?? 0;
        case 'monthly':    return a.monthlyRevenue ?? 0;
        case 'lifetime':   return a.lifetimeRevenue ?? 0;
        case 'lastSignIn': return a.lastSignInAt?.getTime() ?? 0;
        case 'createdAt':  return a.createdAt?.getTime()   ?? 0;
        case 'lastPayment':return a.lastPaymentAt?.getTime() ?? 0;
        default:           return '';
      }
    };
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      // Empty-string / null handling — always last, regardless of dir
      const aEmpty = av === '' || av === null || av === undefined;
      const bEmpty = bv === '' || bv === null || bv === undefined;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [data.accounts, search, filterStatus, sortBy, sortDir]);

  // Click handler for sortable column headers. Clicking the active
  // column toggles direction; clicking a different column sets it as
  // active in the default direction (asc for names, desc for dates +
  // numbers since "most recent" / "highest" is usually what you want).
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      const numericOrDate = ['trial', 'seats', 'monthly', 'lifetime', 'lastSignIn', 'createdAt', 'lastPayment'].includes(col);
      setSortDir(numericOrDate ? 'desc' : 'asc');
    }
  };

  // Tiny arrow component for the active sort column header.
  const sortArrow = (col) => sortBy !== col ? null : (
    <span style={{ marginLeft: 4, fontSize: 12, color: C.green }}>
      {sortDir === 'asc' ? '▲' : '▼'}
    </span>
  );

  // Guard: if the RPC returned NULL (caller isn't actually super_owner),
  // render a clean unauthorized state instead of a broken dashboard.
  if (data.unauthorized) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>Access denied</div>
        <div style={{ fontSize: 16, color: C.muted }}>
          The founder dashboard is restricted to the super-owner account. If you believe you should have access, double-check that <code>is_super_owner</code> is set on your profile in Supabase.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isPhone ? '16px 12px 80px' : '24px 24px 80px', maxWidth: 1400, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
            Founder
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>
            Tradevoice Control Room
          </div>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 6 }}>
            Every account on Tradevoice, signed in as {user?.email || 'founder'}.
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 18px', borderRadius: 8,
            background: C.green, color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div style={{ background: C.redLight, border: `1px solid #fecaca`, color: C.red, padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 15 }}>
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
              label="Canceling"
              value={data.summary.cancelingCount}
              accent={data.summary.cancelingCount > 0 ? C.yellow : C.text}
              sub="Clicked cancel · still active"
              onClick={() => setFilterStatus('canceling')}
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
            <StatTile
              label="Lifetime Revenue"
              value={fmtMoney(data.summary.lifetimeRevenue)}
              accent={C.greenDark}
              sub="Total ever collected"
            />
            <StatTile
              label="This Month"
              value={fmtMoney(data.summary.currentMonthRevenue)}
              accent={C.success}
              sub="Collected since 1st"
            />
          </div>

          {/* Revenue activity strip — refocused from "what did contractors
              do" to "how much money came in." Last-24h revenue is the
              real-time pulse; new signups are the leading indicator. */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '12px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', fontSize: 15,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>
              Last 24 hours
            </div>
            <div>
              <span style={{ fontWeight: 800, color: C.success }}>{fmtMoney(data.summary.last24hRevenue)}</span>
              <span style={{ color: C.muted, marginLeft: 6 }}>collected</span>
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
            border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 16,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8,
            fontSize: 16, background: C.surface, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="canceling">Canceling</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="founder">Founder</option>
        </select>
        {/* Sort shortcut — one-tap "A→Z" vs "newest first" since
            those are the two most common views. Click any column
            header in the table for finer control. */}
        <select
          value={`${sortBy}:${sortDir}`}
          onChange={e => {
            const [b, d] = e.target.value.split(':');
            setSortBy(b);
            setSortDir(d);
          }}
          style={{
            padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8,
            fontSize: 16, background: C.surface, cursor: 'pointer', fontFamily: 'inherit',
          }}
          title="Sort accounts"
        >
          <option value="name:asc">Sort: A → Z (Name)</option>
          <option value="name:desc">Sort: Z → A (Name)</option>
          <option value="company:asc">Sort: A → Z (Company)</option>
          <option value="email:asc">Sort: A → Z (Email)</option>
          <option value="lifetime:desc">Sort: Top revenue (lifetime)</option>
          <option value="monthly:desc">Sort: Top revenue (monthly)</option>
          <option value="lastPayment:desc">Sort: Most recent payment</option>
          <option value="createdAt:desc">Sort: Newest signups first</option>
          <option value="createdAt:asc">Sort: Oldest signups first</option>
          <option value="lastSignIn:desc">Sort: Recently active</option>
          <option value="trial:asc">Sort: Trial ending soonest</option>
        </select>
      </div>

      {/* Account table */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading && data.accounts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 15 }}>Loading accounts…</div>
        ) : visibleAccounts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 15 }}>
            {search || filterStatus !== 'all' ? 'No accounts match this filter.' : 'No accounts yet — first real signup will land here.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ background: '#fafaf7', borderBottom: `1px solid ${C.border}` }}>
                  <SortableTh col="email"      onSort={handleSort} arrow={sortArrow('email')}>Email</SortableTh>
                  <SortableTh col="name"       onSort={handleSort} arrow={sortArrow('name')}>Name / Company</SortableTh>
                  <SortableTh col="plan"       onSort={handleSort} arrow={sortArrow('plan')}>Plan</SortableTh>
                  <SortableTh col="status"     onSort={handleSort} arrow={sortArrow('status')}>Status</SortableTh>
                  <SortableTh col="trial"      onSort={handleSort} arrow={sortArrow('trial')}      align="center">Trial Left</SortableTh>
                  <SortableTh col="monthly"    onSort={handleSort} arrow={sortArrow('monthly')}    align="right">Monthly</SortableTh>
                  <SortableTh col="lifetime"   onSort={handleSort} arrow={sortArrow('lifetime')}   align="right">Lifetime $</SortableTh>
                  <SortableTh col="lastSignIn" onSort={handleSort} arrow={sortArrow('lastSignIn')}>Last Sign-In</SortableTh>
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
                          {a.company && <div style={{ color: C.muted, fontSize: 14 }}>{a.company}</div>}
                        </td>
                        <td style={td}>
                          {a.plan ? <Pill bg="#eff6ff" fg="#1d4ed8">{a.plan}</Pill> : <span style={{ color: C.dim }}>—</span>}
                        </td>
                        <td style={td}>
                          <StatusBadge status={a.subscriptionStatus} isSuperOwner={a.isSuperOwner} isCanceling={a.isCanceling} />
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {a.isSuperOwner ? '—' : (a.subscriptionStatus === 'trialing'
                            ? <span style={{
                                fontWeight: 700,
                                color: a.trialDaysLeft != null && a.trialDaysLeft <= 7 ? C.red : C.text,
                              }}>{a.trialDaysLeft != null ? `${a.trialDaysLeft}d` : '—'}</span>
                            : <span style={{ color: C.dim }}>—</span>)}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: a.monthlyRevenue > 0 ? C.success : C.dim, fontWeight: 700 }}>
                          {a.monthlyRevenue > 0 ? fmtMoney(a.monthlyRevenue) : '—'}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: a.lifetimeRevenue > 0 ? C.greenDark : C.dim, fontWeight: 800 }}>
                          {a.lifetimeRevenue > 0 ? fmtMoney(a.lifetimeRevenue) : '—'}
                          {a.paymentCount > 0 && (
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginTop: 2 }}>
                              {a.paymentCount} payment{a.paymentCount === 1 ? '' : 's'}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, color: C.muted }}>
                          {fmtRel(a.lastSignInAt)}
                        </td>
                      </tr>
                      {expanded && (
                        <tr style={{ background: '#fafaf7', borderBottom: `1px solid ${C.border}` }}>
                          <td colSpan={8} style={{ padding: '14px 18px' }}>
                            {/* Cancellation banner — the highest-signal info
                                when present, so it gets its own row at the
                                top of the drill-down. Renders amber for
                                "they clicked cancel but the period is still
                                running" and red for fully-canceled. */}
                            {a.isCanceling && (
                              <div style={{
                                background: '#fffbeb', border: '1px solid #fde68a',
                                borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                              }}>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: C.yellow, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                    Cancellation Scheduled
                                  </div>
                                  <div style={{ fontSize: 15, color: '#78350f', marginTop: 2 }}>
                                    Customer clicked Cancel. Access ends {a.currentPeriodEnd ? fmtDate(a.currentPeriodEnd) : 'at period end'}.
                                  </div>
                                </div>
                                {a.currentPeriodEnd && (
                                  <div style={{ fontSize: 15, fontWeight: 800, color: '#78350f' }}>
                                    {Math.max(0, Math.ceil((a.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))}d left
                                  </div>
                                )}
                              </div>
                            )}
                            {a.subscriptionStatus === 'canceled' && a.canceledAt && (
                              <div style={{
                                background: C.redLight, border: '1px solid #fecaca',
                                borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                              }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: C.red, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                  Subscription Canceled
                                </div>
                                <div style={{ fontSize: 15, color: '#7f1d1d', marginTop: 2 }}>
                                  Canceled {fmtDate(a.canceledAt)}. No longer paying.
                                </div>
                              </div>
                            )}

                            {/* ── REVENUE BANNER ── The headline number.
                                Lifetime $ from this customer, count of
                                payments, and what they pay each month.
                                Green-tinted so it pops as the most
                                important info on the screen. */}
                            {!a.isSuperOwner && (
                              <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                border: '1px solid #bbf7d0',
                                borderRadius: 10, padding: '14px 18px', marginBottom: 16,
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14,
                              }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.success, marginBottom: 4 }}>
                                    Lifetime Revenue
                                  </div>
                                  <div style={{ fontSize: 26, fontWeight: 900, color: C.success, lineHeight: 1 }}>
                                    {fmtMoney(a.lifetimeRevenue)}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
                                    Payments
                                  </div>
                                  <div style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1 }}>
                                    {a.paymentCount}
                                  </div>
                                  {a.lastPaymentAt && (
                                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                                      Last: {fmtDate(a.lastPaymentAt)}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
                                    Monthly
                                  </div>
                                  <div style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1 }}>
                                    {a.monthlyRevenue > 0 ? fmtMoney(a.monthlyRevenue) : '—'}
                                  </div>
                                  {a.plan && (
                                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                                      {a.plan.charAt(0).toUpperCase() + a.plan.slice(1)} plan
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
                                    Next Payment
                                  </div>
                                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                                    {a.cancelAtPeriodEnd
                                      ? <span style={{ color: C.yellow }}>None — canceling</span>
                                      : (a.currentPeriodEnd ? fmtDate(a.currentPeriodEnd) : 'TBD')}
                                  </div>
                                  {!a.cancelAtPeriodEnd && a.monthlyRevenue > 0 && (
                                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                                      {fmtMoney(a.monthlyRevenue)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Customer context — small, just enough to identify them. */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 14 }}>
                              <DetailField label="Company"   value={a.company || '—'} />
                              <DetailField label="Phone"     value={a.phone   || '—'} />
                              <DetailField label="Signed Up" value={fmtDate(a.createdAt)} />
                              <DetailField label="Last Sign-In" value={fmtDate(a.lastSignInAt)} />
                              <DetailField label="Card on File" value={a.hasCard ? 'Yes' : 'No'} />
                              <DetailField label="Stripe Customer" value={a.stripeCustomerId || '—'} mono />
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
      <div style={{ marginTop: 14, fontSize: 14, color: C.dim, fontStyle: 'italic' }}>
        Loading timeline…
      </div>
    );
  }
  if (state.error) {
    return (
      <div style={{ marginTop: 14, fontSize: 15, color: C.red, background: C.redLight, padding: 10, borderRadius: 6 }}>
        {state.error}
      </div>
    );
  }
  const events = state.events || [];
  if (events.length === 0) {
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
          Subscription Timeline
        </div>
        <div style={{ fontSize: 14, color: C.dim, fontStyle: 'italic' }}>
          No subscription events recorded yet{fallbackCreatedAt ? ` (account created ${fallbackCreatedAt.toLocaleDateString('en-US')})` : ''}. Future Stripe webhook events will land here automatically.
        </div>
      </div>
    );
  }

  // Color + label per event type — keeps the timeline scannable.
  const meta = {
    subscription_created:   { dot: '#2563eb', label: 'Subscription Created' },
    subscription_updated:   { dot: '#6b7280', label: 'Subscription Updated' },
    subscription_canceled:  { dot: '#dc2626', label: 'Subscription Canceled' },
    cancellation_scheduled: { dot: '#d97706', label: 'Cancellation Scheduled' },
    payment_succeeded:      { dot: '#15803d', label: 'Payment Succeeded' },
    payment_failed:         { dot: '#d97706', label: 'Payment Failed' },
    account_created:        { dot: '#2d6a4f', label: 'Account Created' },
    trial_ending:           { dot: '#d97706', label: 'Trial Ending' },
    resubscribed:           { dot: '#2563eb', label: 'Resubscribed' },
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b6b6b', marginBottom: 10 }}>
        Subscription Timeline · {events.length} event{events.length === 1 ? '' : 's'}
      </div>
      <div style={{ position: 'relative', paddingLeft: 18 }}>
        {/* Vertical line connecting the dots */}
        <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: '#e5e7eb' }} />
        {events.map(ev => {
          const m = meta[ev.eventType] || { dot: '#9ca3af', label: ev.eventType };
          return (
            <div key={ev.id} style={{ position: 'relative', paddingBottom: 12, fontSize: 15 }}>
              <div style={{
                position: 'absolute', left: -18, top: 4,
                width: 12, height: 12, borderRadius: '50%',
                background: m.dot, border: '2px solid #fff',
                boxShadow: '0 0 0 1px #e5e7eb',
              }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{m.label}</span>
                {ev.status && (
                  <span style={{ fontSize: 13, color: '#6b6b6b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                    {ev.status}
                  </span>
                )}
                {ev.amount != null && ev.amount > 0 && (
                  <span style={{ fontSize: 14, color: '#15803d', fontWeight: 700 }}>
                    ${ev.amount.toFixed(2)}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 14, color: '#9a9a9a' }}>
                  {ev.occurredAt ? ev.occurredAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                </span>
              </div>
              {ev.stripeSubscriptionId && (
                <div style={{ fontSize: 13, color: '#9a9a9a', marginTop: 2, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
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
  fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: C.muted,
};
const td = { padding: '14px 14px', verticalAlign: 'top' };

// Clickable column header that drives sort. Visually identical to the
// old static <th> but the entire cell is a button that calls onSort
// with this column's key. Active column gets the ▲/▼ arrow next to
// the label so it's obvious which sort is current and which way.
function SortableTh({ col, onSort, arrow, align = 'left', children }) {
  return (
    <th style={{
      ...th,
      textAlign: align,
      cursor: 'pointer',
      userSelect: 'none',
    }}
      onClick={() => onSort(col)}
      title="Click to sort"
    >
      {children}{arrow}
    </th>
  );
}

function DetailField({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, color: C.text, fontFamily: mono ? "ui-monospace, 'SF Mono', Menlo, monospace" : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  );
}
