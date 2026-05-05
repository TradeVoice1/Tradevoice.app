import React, { useState, useMemo, useEffect } from "react";
import { listJobs, upsertJob, deleteJob } from "./data/jobs";
import { markPlanServiced } from "./data/plans";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS = {
  green: '#2d6a4f',
  greenLight: '#f0f7f4',
  greenBorder: '#a7d9be',
  scheduled: '#3b82f6',
  inProgress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const STATUS_COLORS = {
  scheduled: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'in-progress': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  completed: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  cancelled: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am - 7pm

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// (Tech list is now computed from team-member props inside ScheduleScreen.)

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getWeekDays = (date) => {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const formatTime = (hour) => {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
};

const formatDate = (date) =>
  `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

// ─── JOB DETAIL MODAL ────────────────────────────────────────────────────────
function JobDetailModal({ job, techs, onClose, onStatusChange, onCreateInvoice, isTech = false }) {
  const tech = techs.find(t => t.id === job.techUserId);
  const sc = STATUS_COLORS[job.status] || STATUS_COLORS.scheduled;

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: COLORS.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    closeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    body: { padding: '20px 24px' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#aaa', marginBottom: 3 },
    value: { fontSize: 14, color: '#333', fontWeight: 500 },
    badge: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` },
    statusBtns: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 },
    statusBtn: (active, color) => ({ padding: '8px 14px', borderRadius: 8, border: `1px solid ${color}`, background: active ? color : '#fff', color: active ? '#fff' : color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
    actionBtns: { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0' },
    btn: { flex: 1, padding: '12px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{job.trade}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{job.title}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)' }}>{job.client}</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={s.body}>
          <div style={s.row}>
            <div><div style={s.label}>Date & Time</div><div style={s.value}>{formatDate(job.date)} · {formatTime(job.startHour)} — {formatTime(job.startHour + job.duration)}</div></div>
            <div style={s.badge}>{job.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
          </div>
          <div style={s.row}>
            <div><div style={s.label}>Address</div><div style={s.value}>{job.address}</div></div>
          </div>
          <div style={s.row}>
            <div><div style={s.label}>Assigned Tech</div><div style={s.value}>{tech?.name || 'Unassigned'}</div></div>
            <div><div style={s.label}>Invoice</div><div style={{ ...s.value, color: COLORS.green }}>{job.invoiceId}</div></div>
          </div>
          <div style={s.row}>
            <div><div style={s.label}>Client Phone</div><div style={s.value}>{job.phone}</div></div>
          </div>
          {job.notes && (
            <div style={{ padding: '10px 0' }}>
              <div style={s.label}>Notes</div>
              <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginTop: 4 }}>{job.notes}</div>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <div style={s.label}>Update Status</div>
            <div style={s.statusBtns}>
              {['scheduled', 'in-progress', 'completed', 'cancelled'].map(st => (
                <button key={st} style={s.statusBtn(job.status === st, STATUS_COLORS[st].text)} onClick={() => onStatusChange(job.id, st)}>
                  {st.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={s.actionBtns}>
          {/* Owner-only: edit + create-invoice. Techs only see Done. */}
          {!isTech && (
            <>
              <button style={{ ...s.btn, background: COLORS.greenLight, color: COLORS.green }}>Edit Job</button>
              <button
                disabled={job.status !== 'completed' || !!job.invoiceId}
                onClick={() => onCreateInvoice && onCreateInvoice(job)}
                style={{
                  ...s.btn,
                  background: job.status === 'completed' && !job.invoiceId ? COLORS.green : '#e5e7eb',
                  color: job.status === 'completed' && !job.invoiceId ? '#fff' : '#9ca3af',
                  cursor: job.status === 'completed' && !job.invoiceId ? 'pointer' : 'not-allowed',
                }}
              >
                {job.invoiceId ? 'Invoice Created ✓' : 'Create Invoice'}
              </button>
            </>
          )}
          {isTech && (
            <button style={{ ...s.btn, background: COLORS.green, color: '#fff' }} onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADD JOB MODAL ────────────────────────────────────────────────────────────
function AddJobModal({ techs, jobs = [], onClose, onAdd, defaultDate, prefill = null }) {
  // `prefill` lets the parent seed the form (e.g. when scheduling from a recurring plan).
  // The plan's defaults — title, client name, trade, default tech, default duration, planId, target date —
  // flow straight into the initial form state. The user can still override anything before saving.
  const [form, setForm] = useState(() => {
    const base = {
      title: '', client: '', address: '', phone: '', notes: '',
      techUserId: techs[0]?.id || null, date: defaultDate || new Date(),
      startHour: 9, duration: 2, trade: 'Plumber', status: 'scheduled',
      planId: null, clientId: null,
    };
    if (!prefill) return base;
    return {
      ...base,
      title:      prefill.title       ?? base.title,
      client:     prefill.clientName  ?? base.client,
      clientId:   prefill.clientId    ?? base.clientId,
      trade:      prefill.trade       || base.trade,
      duration:   prefill.duration    ?? base.duration,
      techUserId: prefill.techUserId  ?? base.techUserId,
      notes:      prefill.notes       ?? base.notes,
      planId:     prefill.planId      ?? base.planId,
      date:       prefill.date ? new Date(prefill.date + 'T12:00:00') : base.date,
    };
  });

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Smart suggestions: pulled from the job history.
  // When the user fills in the client name, look up the most-recent job for that client
  // and pre-suggest the tech who serviced them last + its trade.
  // When the user fills in the job title, suggest the average duration of similar jobs.
  const lastJobForClient = useMemo(() => {
    if (!form.client.trim()) return null;
    const needle = form.client.trim().toLowerCase();
    return jobs
      .filter(j => (j.client || '').toLowerCase() === needle && j.techUserId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
  }, [form.client, jobs]);

  const avgDurationForTitle = useMemo(() => {
    if (!form.title.trim()) return null;
    const needle = form.title.trim().toLowerCase();
    const matches = jobs.filter(j => (j.title || '').toLowerCase().includes(needle) && j.duration > 0);
    if (matches.length === 0) return null;
    const avg = matches.reduce((s, j) => s + j.duration, 0) / matches.length;
    return Math.round(avg * 2) / 2; // nearest 0.5 hr
  }, [form.title, jobs]);

  // Auto-apply suggestions only if the user hasn't manually overridden the field.
  const [techDirty,     setTechDirty]     = useState(false);
  const [durationDirty, setDurationDirty] = useState(false);
  const [tradeDirty,    setTradeDirty]    = useState(false);

  useEffect(() => {
    if (lastJobForClient && !techDirty) {
      setForm(p => ({ ...p, techUserId: lastJobForClient.techUserId }));
    }
    if (lastJobForClient && !tradeDirty && lastJobForClient.trade) {
      setForm(p => ({ ...p, trade: lastJobForClient.trade }));
    }
  }, [lastJobForClient, techDirty, tradeDirty]);

  useEffect(() => {
    if (avgDurationForTitle && !durationDirty) {
      setForm(p => ({ ...p, duration: avgDurationForTitle }));
    }
  }, [avgDurationForTitle, durationDirty]);

  const lastTechName = lastJobForClient ? techs.find(t => t.id === lastJobForClient.techUserId)?.name : null;
  const lastJobDate  = lastJobForClient ? new Date(lastJobForClient.date).toLocaleDateString() : null;

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: COLORS.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body: { padding: '20px 24px' },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block', marginTop: 14 },
    input: { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    select: { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary) => ({ flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : '1px solid #ddd', background: primary ? COLORS.green : '#fff', color: primary ? '#fff' : '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
  };

  const handleAdd = () => {
    if (!form.title || !form.client) return;
    onAdd({ ...form, id: Date.now() });
    onClose();
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Schedule New Job</span>
          <button style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }} onClick={onClose}>×</button>
        </div>
        <div style={s.body}>
          <label style={s.label}>Job Title</label>
          <input style={s.input} placeholder="e.g. Faucet Repair" value={form.title} onChange={e => update('title', e.target.value)} />
          {avgDurationForTitle && !durationDirty && (
            <div style={{ fontSize: 12, color: COLORS.green, marginTop: 4 }}>
              Auto-set duration to {avgDurationForTitle} hr (avg of similar jobs)
            </div>
          )}
          <label style={s.label}>Client Name</label>
          <input style={s.input} placeholder="John Miller" value={form.client} onChange={e => update('client', e.target.value)} />
          {lastTechName && !techDirty && (
            <div style={{ fontSize: 12, color: COLORS.green, marginTop: 4 }}>
              Last serviced by {lastTechName} on {lastJobDate} — auto-assigned
            </div>
          )}
          <label style={s.label}>Address</label>
          <input style={s.input} placeholder="2847 Magnolia Dr, Houston TX" value={form.address} onChange={e => update('address', e.target.value)} />
          <label style={s.label}>Client Phone</label>
          <input style={s.input} placeholder="(713) 555-0100" value={form.phone} onChange={e => update('phone', e.target.value)} />
          <div style={s.row2}>
            <div>
              <label style={s.label}>Trade</label>
              <select style={s.select} value={form.trade} onChange={e => { update('trade', e.target.value); setTradeDirty(true); }}>
                {['Plumber','HVAC','Electrician','Roofing','Specialty'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Assigned Tech</label>
              <select style={s.select} value={form.techUserId || ''} onChange={e => { update('techUserId', e.target.value || null); setTechDirty(true); }}>
                <option value="">Unassigned</option>
                {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div style={s.row2}>
            <div>
              <label style={s.label}>Start Time</label>
              <select style={s.select} value={form.startHour} onChange={e => update('startHour', parseInt(e.target.value))}>
                {HOURS.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Duration</label>
              <select style={s.select} value={form.duration} onChange={e => { update('duration', parseFloat(e.target.value)); setDurationDirty(true); }}>
                {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} {h === 1 ? 'hour' : 'hours'}</option>)}
              </select>
            </div>
          </div>
          <label style={s.label}>Notes</label>
          <textarea style={{ ...s.input, height: 80, resize: 'vertical' }} placeholder="Job notes..." value={form.notes} onChange={e => update('notes', e.target.value)} />
        </div>
        <div style={s.footer}>
          <button style={s.btn(false)} onClick={onClose}>Cancel</button>
          <button style={s.btn(true)} onClick={handleAdd}>Schedule Job</button>
        </div>
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({ weekDays, jobs, techs, onJobClick, filterTech }) {
  const filtered = filterTech ? jobs.filter(j => j.techUserId === filterTech) : jobs;

  const s = {
    wrap: { overflowX: 'auto' },
    grid: { display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: 700 },
    dayHeader: (isToday) => ({ padding: '10px 8px', textAlign: 'center', background: isToday ? COLORS.greenLight : '#fafafa', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #f0f0f0' }),
    dayName: (isToday) => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: isToday ? COLORS.green : '#aaa' }),
    dayNum: (isToday) => ({ fontSize: 22, fontWeight: 900, color: isToday ? COLORS.green : '#111', marginTop: 2 }),
    timeCol: { fontSize: 11, color: '#bbb', textAlign: 'right', paddingRight: 8, paddingTop: 4, borderRight: '1px solid #e8e8e8' },
    cell: { borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #f8f8f8', minHeight: 56, position: 'relative' },
    jobBlock: (color) => ({ position: 'absolute', left: 2, right: 2, background: color, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', overflow: 'hidden', zIndex: 1 }),
  };

  const today = new Date();

  const getJobsForDayHour = (day, hour) =>
    filtered.filter(j => isSameDay(j.date, day) && j.startHour === hour);

  const getTechColor = (techId) => {
    const tech = techs.find(t => t.id === techId);
    return tech?.color || COLORS.green;
  };

  return (
    <div style={s.wrap}>
      <div style={s.grid}>
        {/* Header row */}
        <div style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #e8e8e8' }} />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} style={s.dayHeader(isToday)}>
              <div style={s.dayName(isToday)}>{DAYS[day.getDay()]}</div>
              <div style={s.dayNum(isToday)}>{day.getDate()}</div>
            </div>
          );
        })}
        {/* Time rows */}
        {HOURS.map(hour => (
          <>
            <div key={`time-${hour}`} style={{ ...s.timeCol, height: 56, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4, fontSize: 11, color: '#bbb', borderRight: '1px solid #e8e8e8', borderBottom: '1px solid #f8f8f8' }}>
              {formatTime(hour)}
            </div>
            {weekDays.map((day, di) => {
              const dayJobs = getJobsForDayHour(day, hour);
              const isToday = isSameDay(day, today);
              return (
                <div key={`cell-${hour}-${di}`} style={{ ...s.cell, background: isToday ? '#fafff9' : '#fff', height: 56 }}>
                  {dayJobs.map(job => (
                    <div key={job.id} style={{ ...s.jobBlock(getTechColor(job.techUserId)), top: 2, height: job.duration * 56 - 4, opacity: job.status === 'cancelled' ? 0.35 : job.status === 'completed' ? 0.6 : 1, ...(job.status === 'scheduled' && new Date(job.date) < new Date(new Date().toDateString()) ? { background: '#fef2f2', borderLeft: '3px solid #dc2626' } : {}) }} onClick={() => onJobClick(job)}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.client}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// ─── DAY VIEW ─────────────────────────────────────────────────────────────────
function DayView({ date, jobs, techs, onJobClick, filterTech }) {
  const filtered = (filterTech ? jobs.filter(j => j.techUserId === filterTech) : jobs)
    .filter(j => isSameDay(j.date, date));

  const getTechColor = (techId) => techs.find(t => t.id === techId)?.color || COLORS.green;
  const getTech = (techId) => techs.find(t => t.id === techId);

  const s = {
    wrap: { display: 'grid', gridTemplateColumns: '60px 1fr' },
    timeCol: { borderRight: '1px solid #e8e8e8', paddingRight: 8, paddingTop: 4, fontSize: 11, color: '#bbb', textAlign: 'right', height: 72, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', borderBottom: '1px solid #f5f5f5' },
    cell: { position: 'relative', height: 72, borderBottom: '1px solid #f5f5f5' },
    jobBlock: (color) => ({ position: 'absolute', left: 8, right: 8, background: color, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }),
  };

  return (
    <div style={s.wrap}>
      {HOURS.map(hour => {
        const hourJobs = filtered.filter(j => j.startHour === hour);
        return (
          <>
            <div key={`t-${hour}`} style={s.timeCol}>{formatTime(hour)}</div>
            <div key={`c-${hour}`} style={s.cell}>
              {hourJobs.map(job => {
                const tech = getTech(job.techUserId);
                return (
                  <div key={job.id} style={{ ...s.jobBlock(getTechColor(job.techUserId)), top: 4, height: job.duration * 72 - 8, opacity: job.status === 'cancelled' ? 0.35 : job.status === 'completed' ? 0.6 : 1, ...(job.status === 'scheduled' && new Date(job.date) < new Date(new Date().toDateString()) ? { background: '#fef2f2', borderLeft: '3px solid #dc2626' } : {}) }} onClick={() => onJobClick(job)}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)' }}>{job.client} · {job.address.split(',')[0]}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{formatTime(job.startHour)} — {formatTime(job.startHour + job.duration)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{tech?.initials}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', background: 'rgba(255,255,255,.15)', padding: '2px 6px', borderRadius: 4 }}>{job.trade}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })}
    </div>
  );
}

// ─── MONTH VIEW ───────────────────────────────────────────────────────────────
function MonthView({ date, jobs, techs, onJobClick, filterTech, onDayClick }) {
  const filtered = filterTech ? jobs.filter(j => j.techUserId === filterTech) : jobs;
  const today = new Date();

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startPad = firstDay.getDay();
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const getTechColor = (techId) => techs.find(t => t.id === techId)?.color || COLORS.green;

  const s = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
    dayHeader: { padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#aaa', borderBottom: '1px solid #e8e8e8' },
    cell: (isCurrentMonth, isToday) => ({ minHeight: 90, padding: '6px', border: '1px solid #f0f0f0', background: isToday ? COLORS.greenLight : isCurrentMonth ? '#fff' : '#fafafa', cursor: 'pointer' }),
    dayNum: (isToday) => ({ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? COLORS.green : '#333', marginBottom: 4, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? 'rgba(45,106,79,.15)' : 'transparent' }),
    jobDot: (color) => ({ fontSize: 11, color: '#fff', background: color, borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }),
  };

  return (
    <div style={s.grid}>
      {DAYS.map(d => <div key={d} style={s.dayHeader}>{d}</div>)}
      {Array.from({ length: totalCells }, (_, i) => {
        const dayNum = i - startPad + 1;
        const cellDate = new Date(date.getFullYear(), date.getMonth(), dayNum);
        const isCurrentMonth = dayNum >= 1 && dayNum <= lastDay.getDate();
        const isToday = isSameDay(cellDate, today);
        const dayJobs = filtered.filter(j => isSameDay(j.date, cellDate));
        return (
          <div key={i} style={s.cell(isCurrentMonth, isToday)} onClick={() => isCurrentMonth && onDayClick(cellDate)}>
            <div style={s.dayNum(isToday)}>{isCurrentMonth ? dayNum : ''}</div>
            {dayJobs.slice(0, 3).map(job => (
              <div key={job.id} style={s.jobDot(getTechColor(job.techUserId))} onClick={e => { e.stopPropagation(); onJobClick(job); }}>
                {job.title}
              </div>
            ))}
            {dayJobs.length > 3 && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>+{dayJobs.length - 3} more</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN SCHEDULE SCREEN ─────────────────────────────────────────────────────
export default function ScheduleScreen({
  user, team = [], onCreateInvoice,
  // Plans wiring — App owns the master plans list. We need it here to:
  //  1. Refresh `plan.last_serviced_at` / `plan.next_due_at` whenever a plan-linked job completes.
  //  2. Receive a prefilled job draft (`pendingJobDraft`) from the Plans → "Schedule Job" button
  //     and auto-open the AddJobModal with those values.
  plans = [], setPlans, pendingJobDraft, clearPendingJobDraft,
}) {
  // When the signed-in user's role is 'tech', this screen becomes their personal
  // "My Schedule" — filtered to only jobs assigned to them, with no add/reassign UI.
  // Owners see everything across the company and can create + reassign.
  const isTech = user?.role === 'tech';

  const [view, setView] = useState('week'); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allJobs, setAllJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [filterTech, setFilterTech] = useState(null);
  const [addJobDate, setAddJobDate] = useState(null);

  // Auto-filter to the tech's own jobs when they're a tech. The owner sees everything.
  const jobs = useMemo(() => (
    isTech ? allJobs.filter(j => j.techUserId === user?.id) : allJobs
  ), [allJobs, isTech, user?.id]);

  // Wrapper so existing setJobs() call sites still work (operate on the master list).
  const setJobs = (updater) => setAllJobs(prev => typeof updater === 'function' ? updater(prev) : updater);

  // Load jobs from Supabase on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listJobs();
        if (!cancelled) setJobs(rows);
      } catch (e) {
        console.error('listJobs failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // When the user clicks "Schedule Job" on a plan, App.jsx routes us here and stashes a
  // prefilled draft. Opening the modal here means the Add-Job flow takes over with the
  // plan's defaults already populated.
  useEffect(() => {
    if (pendingJobDraft) {
      // Position the calendar on the target date so the new job lands in view immediately.
      if (pendingJobDraft.date) {
        const d = new Date(pendingJobDraft.date + 'T12:00:00');
        if (!isNaN(d.getTime())) setCurrentDate(d);
      }
      setShowAddJob(true);
    }
  }, [pendingJobDraft]);

  const weekDays = getWeekDays(currentDate);

  // Build a tech list from the owner's team (passed in from App.jsx). Fall back to a single
  // "you" entry so the calendar still works before any techs are added.
  const techs = (team && team.length)
    ? team.map(t => ({ id: t.id, name: t.name || 'Tech', color: '#2d6a4f', initials: (t.name || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() }))
    : (user ? [{ id: user.id, name: user.name || 'You', color: '#2d6a4f', initials: (user.name || 'Y').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() }] : []);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const handleStatusChange = async (id, status) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
    setSelectedJob(prev => prev ? { ...prev, status } : null);
    if (!user?.id) return;
    const target = jobs.find(j => j.id === id);
    if (!target) return;
    try {
      await upsertJob(user.id, { ...target, status });

      // If this job came from a recurring maintenance plan and just hit 'completed',
      // bump the plan's last_serviced_at to today and roll next_due_at forward by
      // the plan's frequency. The Plans screen and Dashboard widget pick up the change
      // automatically via the shared `plans` state.
      if (status === 'completed' && target.planId && setPlans) {
        try {
          const todayIso = new Date().toISOString().split('T')[0];
          const updated  = await markPlanServiced(target.planId, todayIso);
          setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        } catch (planErr) {
          console.error('markPlanServiced failed', planErr);
        }
      }
    } catch (e) {
      console.error('status change failed', e);
    }
  };

  const handleAddJob = async (job) => {
    if (!user?.id) return;
    try {
      const draft = { ...job, date: addJobDate || currentDate };
      const saved = await upsertJob(user.id, draft);
      setJobs(prev => [...prev, saved]);
    } catch (e) {
      alert(e?.message || 'Could not save job.');
    }
  };

  const handleDayClick = (date) => {
    setCurrentDate(date);
    setView('day');
  };

  const todayJobs = jobs.filter(j => isSameDay(j.date, new Date()));
  const upcomingJobs = jobs.filter(j => j.date > new Date() && j.status !== 'cancelled').slice(0, 5);

  const headerTitle = () => {
    if (view === 'month') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') return `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()} — ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`;
    return formatDate(currentDate);
  };

  const s = {
    wrap: { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
    title: { fontSize: 20, fontWeight: 800, color: '#111' },
    addBtn: { padding: '10px 18px', background: COLORS.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
    toolbar: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
    navBtn: { background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16, color: '#666' },
    dateLabel: { fontSize: 15, fontWeight: 700, color: '#111', minWidth: 200, textAlign: 'center' },
    viewBtns: { display: 'flex', gap: 4 },
    viewBtn: (active) => ({ padding: '6px 14px', borderRadius: 8, border: 'none', background: active ? COLORS.green : '#f0f0f0', color: active ? '#fff' : '#666', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer' }),
    body: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0, height: 'calc(100vh - 120px)' },
    calendar: { background: '#fff', overflow: 'auto', borderRight: '1px solid #e8e8e8' },
    sidebar: { background: '#fff', overflowY: 'auto', padding: '20px 16px' },
    sideSection: { marginBottom: 24 },
    sideTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: '#aaa', marginBottom: 12 },
    techBtn: (active, color) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${active ? color : '#e8e8e8'}`, background: active ? `${color}15` : '#fff', cursor: 'pointer', marginBottom: 6, width: '100%' }),
    techDot: (color) => ({ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }),
    techName: { fontSize: 13, fontWeight: 500, color: '#333' },
    upcomingJob: { padding: '10px 12px', borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 8, cursor: 'pointer' },
    upcomingTitle: { fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 },
    upcomingMeta: { fontSize: 12, color: '#888' },
  };

  return (
    <div style={s.wrap}>
      {/* Header — owner sees the company schedule + Add Job; tech sees their own. */}
      <div style={s.header}>
        <div>
          <div style={s.title}>{isTech ? 'My Schedule' : 'Schedule'}</div>
          {isTech && (
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              Jobs assigned to you · {jobs.length} this {view === 'day' ? 'day' : view}
            </div>
          )}
        </div>
        {!isTech && (
          <button style={s.addBtn} onClick={() => { setAddJobDate(currentDate); setShowAddJob(true); }}>+ Schedule Job</button>
        )}
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={s.navBtn} onClick={() => navigate(-1)}>‹</button>
          <button style={{ ...s.navBtn, fontSize: 13 }} onClick={() => setCurrentDate(new Date())}>Today</button>
          <button style={s.navBtn} onClick={() => navigate(1)}>›</button>
          <span style={s.dateLabel}>{headerTitle()}</span>
        </div>
        <div style={s.viewBtns}>
          {['month', 'week', 'day'].map(v => (
            <button key={v} style={s.viewBtn(view === v)} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>
        <div style={s.calendar}>
          {view === 'month' && <MonthView date={currentDate} jobs={jobs} techs={techs} onJobClick={setSelectedJob} filterTech={filterTech} onDayClick={handleDayClick} />}
          {view === 'week' && <WeekView weekDays={weekDays} jobs={jobs} techs={techs} onJobClick={setSelectedJob} filterTech={filterTech} />}
          {view === 'day' && <DayView date={currentDate} jobs={jobs} techs={techs} onJobClick={setSelectedJob} filterTech={filterTech} />}
        </div>

        {/* Sidebar */}
        <div style={s.sidebar}>
          {/* Tech Filter — owner-only. Tech accounts only see their own jobs anyway. */}
          {!isTech && techs.length > 0 && (
            <div style={s.sideSection}>
              <div style={s.sideTitle}>Filter by Tech</div>
              <button style={s.techBtn(!filterTech, COLORS.green)} onClick={() => setFilterTech(null)}>
                <div style={s.techDot('#aaa')} />
                <span style={s.techName}>All Technicians</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', fontWeight: 700 }}>{allJobs.length}</span>
              </button>
              {techs.map(tech => {
                const count = allJobs.filter(j => j.techUserId === tech.id).length;
                return (
                  <button key={tech.id} style={s.techBtn(filterTech === tech.id, tech.color)} onClick={() => setFilterTech(filterTech === tech.id ? null : tech.id)}>
                    <div style={s.techDot(tech.color)} />
                    <span style={s.techName}>{tech.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', fontWeight: 700 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Today's Jobs */}
          <div style={s.sideSection}>
            <div style={s.sideTitle}>Today — {todayJobs.length} jobs</div>
            {todayJobs.length === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>No jobs today</div>}
            {todayJobs.map(job => {
              const sc = STATUS_COLORS[job.status] || STATUS_COLORS.scheduled;
              return (
                <div key={job.id} style={s.upcomingJob} onClick={() => setSelectedJob(job)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={s.upcomingTitle}>{job.title}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc.text, background: sc.bg, padding: '2px 6px', borderRadius: 4 }}>
                      {job.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div style={s.upcomingMeta}>{job.client} · {formatTime(job.startHour)}</div>
                </div>
              );
            })}
          </div>

          {/* Upcoming */}
          <div style={s.sideSection}>
            <div style={s.sideTitle}>Upcoming</div>
            {upcomingJobs.map(job => (
              <div key={job.id} style={s.upcomingJob} onClick={() => setSelectedJob(job)}>
                <div style={s.upcomingTitle}>{job.title}</div>
                <div style={s.upcomingMeta}>{job.client} · {formatDate(job.date)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          techs={techs}
          isTech={isTech}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
          onCreateInvoice={async (job) => {
            if (!onCreateInvoice) return;
            try {
              const newInv = await onCreateInvoice(job);
              if (newInv) {
                // Stamp the job with the invoice number/id so it can't be invoiced twice.
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, invoiceId: newInv.number } : j));
                setSelectedJob(prev => prev ? { ...prev, invoiceId: newInv.number } : null);
                if (user?.id) {
                  // Persist the invoiceId on the job row so it survives a refresh.
                  // (Job table doesn't have invoice_id wired into the upsert path yet — soft skip on failure.)
                  upsertJob(user.id, { ...job, invoiceId: newInv.id }).catch(() => {});
                }
              }
            } catch (e) {
              alert(e?.message || 'Could not create invoice from job.');
            }
          }}
        />
      )}
      {showAddJob && (
        <AddJobModal
          techs={techs}
          jobs={jobs}
          prefill={pendingJobDraft}
          onClose={() => {
            setShowAddJob(false);
            // Clear the prefill so re-opening the Add Job modal manually starts blank.
            if (pendingJobDraft && clearPendingJobDraft) clearPendingJobDraft();
          }}
          onAdd={handleAddJob}
          defaultDate={addJobDate}
        />
      )}
    </div>
  );
}
