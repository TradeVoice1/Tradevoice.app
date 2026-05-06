// Jobs hub — flat list view of every job, grouped by date.
// Calendar (ScheduleScreen) shows "what's happening when". This shows
// "everything I need to deal with" and is built for fast tech assignment +
// status updates + photo glance — without flipping through a calendar.
//
// Click any row to open the full JobDetailModal (reused from ScheduleScreen)
// for editing, photos, status, etc.

import React, { useState, useEffect, useMemo } from "react";
import { listJobs, upsertJob } from "./data/jobs";
import { JobDetailModal } from "./ScheduleScreen";

// Local palette / status colors — duplicated from ScheduleScreen so this
// component is self-contained at module scope (avoids cross-file pulls
// of internal constants beyond JobDetailModal itself).
const C = {
  bg:        '#f3f6f4',
  surface:   '#ffffff',
  surface2:  '#fbfdfc',
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
  shadow1:   '0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.03)',
};

const STATUS_PALETTE = {
  scheduled:    { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe', label: 'Scheduled' },
  'in-progress':{ bg: '#fffbeb', fg: '#b45309', border: '#fde68a', label: 'In progress' },
  completed:    { bg: '#f0fdf4', fg: '#166534', border: '#bbf7d0', label: 'Completed' },
  cancelled:    { bg: '#fef2f2', fg: '#991b1b', border: '#fecaca', label: 'Cancelled' },
};

const formatTime = (h) => h == null ? '' : (h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`);

// Groups a job into one of seven date buckets. The order in the returned
// object's keys also drives display order (Overdue first, Past last).
const dateBuckets = () => ({
  Overdue:    [],
  Today:      [],
  Tomorrow:   [],
  'This Week': [],
  'Next Week': [],
  Later:      [],
  Past:       [],
});

export default function JobsScreen({ user, team = [], onCreateInvoice }) {
  const [jobs,         setJobs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedJob,  setSelectedJob]  = useState(null);
  const [filterTech,   setFilterTech]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search,       setSearch]       = useState('');

  // Tech-mode users only see/manage their own jobs.
  const isTech = user?.role === 'tech';

  // Hydrate from Supabase on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listJobs();
        if (!cancelled) setJobs(rows);
      } catch (e) { console.error('JobsScreen.listJobs', e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build a tech list for filters + inline reassignment dropdowns.
  // Always include the owner (so a one-person shop can still self-assign).
  const techs = useMemo(() => {
    const list = (team && team.length)
      ? team.map(t => ({
          id: t.userId || t.id,
          name: t.name || 'Tech',
          color: C.green,
          initials: (t.name || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        }))
      : [];
    if (user && !list.find(t => t.id === user.id)) {
      list.unshift({
        id: user.id,
        name: user.name || 'You',
        color: C.green,
        initials: (user.name || 'Y').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      });
    }
    return list;
  }, [team, user]);

  // Apply filters: tech-mode auto-filter, then explicit tech / status / search.
  const visibleJobs = useMemo(() => {
    let result = jobs;
    if (isTech) result = result.filter(j => j.techUserId === user?.id);
    if (filterTech !== 'all') {
      result = result.filter(j => (filterTech === '' ? !j.techUserId : j.techUserId === filterTech));
    }
    if (filterStatus !== 'all') result = result.filter(j => j.status === filterStatus);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(j =>
        (j.title      || '').toLowerCase().includes(s) ||
        (j.clientName || '').toLowerCase().includes(s) ||
        (j.address    || '').toLowerCase().includes(s) ||
        (j.notes      || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [jobs, isTech, user?.id, filterTech, filterStatus, search]);

  // Bucket by date. Overdue = past + still scheduled (not completed/cancelled).
  const grouped = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const oneWeek  = new Date(today); oneWeek.setDate(today.getDate() + 7);
    const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);

    const buckets = dateBuckets();
    visibleJobs.forEach(j => {
      const d = new Date(j.date); d.setHours(0, 0, 0, 0);
      if (d < today) {
        if (j.status === 'scheduled' || j.status === 'in-progress') buckets.Overdue.push(j);
        else                                                         buckets.Past.push(j);
      } else if (d.getTime() === today.getTime())    buckets.Today.push(j);
      else if (d.getTime() === tomorrow.getTime())   buckets.Tomorrow.push(j);
      else if (d < oneWeek)                          buckets['This Week'].push(j);
      else if (d < twoWeeks)                         buckets['Next Week'].push(j);
      else                                           buckets.Later.push(j);
    });

    // Within each bucket, sort earliest first (Past flips to most-recent first).
    Object.values(buckets).forEach(b => b.sort((a, c) => {
      const dx = new Date(a.date) - new Date(c.date);
      return dx !== 0 ? dx : (a.startHour || 0) - (c.startHour || 0);
    }));
    buckets.Past.reverse();

    return buckets;
  }, [visibleJobs]);

  // ── Mutation handlers (shared with the JobDetailModal when it's open) ─────

  const handleStatusChange = async (id, status) => {
    const target = jobs.find(j => j.id === id);
    if (!target || !user?.id) return;
    const updated = { ...target, status };
    setJobs(prev => prev.map(j => j.id === id ? updated : j));
    setSelectedJob(prev => prev && prev.id === id ? updated : prev);
    try { await upsertJob(user.id, updated); }
    catch (e) { console.error('JobsScreen status save failed', e); }
  };

  const handlePhotosChange = async (jobId, photos) => {
    const target = jobs.find(j => j.id === jobId);
    if (!target || !user?.id) return;
    const updated = { ...target, photos };
    setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    setSelectedJob(prev => prev && prev.id === jobId ? updated : prev);
    try { await upsertJob(user.id, updated); }
    catch (e) { console.error('JobsScreen photos save failed', e); }
  };

  // Inline tech reassignment from a row — owner-only.
  const handleTechChange = async (jobId, newTechId) => {
    const target = jobs.find(j => j.id === jobId);
    if (!target || !user?.id) return;
    const updated = { ...target, techUserId: newTechId || null };
    setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    try { await upsertJob(user.id, updated); }
    catch (e) { console.error('JobsScreen tech assign failed', e); }
  };

  // Job → Invoice — same flow as ScheduleScreen.
  const handleCreateInvoiceFromJob = async (job) => {
    if (!onCreateInvoice) return;
    try {
      const newInv = await onCreateInvoice(job);
      if (newInv) {
        const updated = { ...job, invoiceId: newInv.number };
        setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
        setSelectedJob(prev => prev && prev.id === job.id ? updated : prev);
        if (user?.id) upsertJob(user.id, { ...job, invoiceId: newInv.id }).catch(() => {});
      }
    } catch (e) { alert(e?.message || 'Could not create invoice from job.'); }
  };

  // ── Row component (declared inline so it closes over handlers) ────────────
  const Row = ({ job }) => {
    const tech = techs.find(t => t.id === job.techUserId);
    const sc = STATUS_PALETTE[job.status] || STATUS_PALETTE.scheduled;
    const photos = Array.isArray(job.photos) ? job.photos : [];
    const date = new Date(job.date);

    return (
      <div
        onClick={() => setSelectedJob(job)}
        style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto auto',
          gap: 14, alignItems: 'center',
          boxShadow: C.shadow1,
          transition: 'border-color 0.15s, transform 0.05s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.green + '99'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
      >
        {/* Date + time micro-block */}
        <div style={{ minWidth: 64, textAlign: 'center', paddingRight: 12, borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted }}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1, margin: '2px 0' }}>
            {date.getDate()}
          </div>
          <div style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>
            {formatTime(job.startHour)}
          </div>
        </div>

        {/* Title + client + address */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.title || '(no title)'}
          </div>
          <div style={{ fontSize: 13, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.clientName || 'No client'}
            {job.address ? ` · ${job.address.split(',')[0]}` : ''}
          </div>
        </div>

        {/* Inline tech reassign — owner-only. Click stops propagation so the
            row's onClick (which opens the detail modal) doesn't fire. */}
        {!isTech ? (
          <select
            value={job.techUserId || ''}
            onClick={e => e.stopPropagation()}
            onChange={e => handleTechChange(job.id, e.target.value || null)}
            style={{
              padding: '6px 10px', fontSize: 13, border: `1px solid ${C.border}`,
              borderRadius: 6, cursor: 'pointer', fontWeight: 600,
              background: tech ? tech.color + '15' : C.bg,
              color:      tech ? tech.color        : C.muted,
              minWidth: 140, fontFamily: 'inherit',
            }}
          >
            <option value="">— Unassigned —</option>
            {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <span style={{
            fontSize: 13, fontWeight: 700, color: tech?.color || C.muted,
            padding: '6px 10px', background: (tech?.color || C.muted) + '15',
            borderRadius: 6, minWidth: 80, textAlign: 'center',
          }}>
            {tech?.name || 'Unassigned'}
          </span>
        )}

        {/* Photos count badge */}
        <span title={`${photos.length} photo${photos.length === 1 ? '' : 's'}`} style={{
          fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 5,
          background: photos.length > 0 ? C.greenLo : C.bg,
          color:      photos.length > 0 ? C.green   : C.dim,
          border: `1px solid ${photos.length > 0 ? C.green + '33' : C.border}`,
          minWidth: 56, textAlign: 'center', whiteSpace: 'nowrap',
        }}>
          {photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'No photos'}
        </span>

        {/* Status pill */}
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '4px 9px', borderRadius: 4,
          background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`,
          minWidth: 92, textAlign: 'center', whiteSpace: 'nowrap',
        }}>
          {sc.label}
        </span>
      </div>
    );
  };

  const totalVisible = visibleJobs.length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.025em' }}>
            {isTech ? 'My Jobs' : 'Jobs'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: C.muted, fontWeight: 500 }}>
            {loading
              ? 'Loading…'
              : `${totalVisible} job${totalVisible === 1 ? '' : 's'}${totalVisible !== jobs.length ? ` (of ${jobs.length} total)` : ''}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search title, client, address, notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 240px', minWidth: 200, padding: '10px 14px',
            border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14,
            background: C.surface, fontFamily: 'inherit',
          }}
        />
        {!isTech && techs.length > 0 && (
          <select value={filterTech} onChange={e => setFilterTech(e.target.value)}
            style={{
              padding: '10px 14px', border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 14, background: C.surface,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <option value="all">All techs</option>
            {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            <option value="">Unassigned</option>
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px', border: `1px solid ${C.border}`,
            borderRadius: 8, fontSize: 14, background: C.surface,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <option value="all">All status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(filterTech !== 'all' || filterStatus !== 'all' || search.trim()) && (
          <button
            onClick={() => { setFilterTech('all'); setFilterStatus('all'); setSearch(''); }}
            style={{
              padding: '10px 14px', border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 14, background: C.surface,
              cursor: 'pointer', color: C.muted, fontFamily: 'inherit',
            }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Body */}
      {loading && <div style={{ padding: 24, textAlign: 'center', color: C.dim, fontSize: 14 }}>Loading jobs…</div>}
      {!loading && totalVisible === 0 && (
        <div style={{ padding: '32px 24px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, textAlign: 'center', color: C.muted }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            {jobs.length === 0 ? 'No jobs yet' : 'No jobs match these filters'}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
            {jobs.length === 0
              ? (isTech ? 'When the owner schedules a job for you, it shows up here.' : 'Open the Schedule view and click a calendar slot to create your first job.')
              : 'Adjust the search or filters above to see more.'}
          </div>
        </div>
      )}
      {!loading && Object.entries(grouped).map(([label, list]) => (
        list.length === 0 ? null : (
          <div key={label} style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: label === 'Overdue' ? C.errorBold : label === 'Today' ? C.green : C.muted,
              marginBottom: 8, paddingBottom: 6,
              borderBottom: `1px solid ${label === 'Overdue' ? C.errorBold + '44' : C.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {label}
              <span style={{ fontSize: 11, color: C.dim, fontWeight: 600, letterSpacing: 0 }}>
                {list.length} job{list.length === 1 ? '' : 's'}
              </span>
            </div>
            {list.map(job => <Row key={job.id} job={job} />)}
          </div>
        )
      ))}

      {/* Detail modal — same one Schedule uses, so editing flows through the
          existing photo upload, status, tech, create-invoice machinery. */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          techs={techs}
          isTech={isTech}
          userId={user?.id}
          onPhotosChange={(photos) => handlePhotosChange(selectedJob.id, photos)}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
          onCreateInvoice={handleCreateInvoiceFromJob}
        />
      )}
    </div>
  );
}
