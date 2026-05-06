import React, { useState, useMemo, useEffect, useRef } from "react";
import { listJobs, upsertJob, deleteJob } from "./data/jobs";
import { markPlanServiced } from "./data/plans";
import { isTechOffOn, timeOffInRange } from "./data/timeOff";
import { uploadJobPhoto, deleteJobPhoto } from "./data/jobPhotos";
import { compressImage } from "./lib/imageCompress";
import { useEscapeClose } from "./lib/useEscapeClose";
import { useBreakpoint } from "./lib/useBreakpoint";

// ─── DRAG-RESCHEDULE HOOK ────────────────────────────────────────────────────
// Pointer-events-based drag so it works on both mouse and touch (iPad).
// A "drag" only kicks in once the pointer has moved more than DRAG_THRESHOLD
// pixels from the press point — anything less is treated as a tap and
// passes through to the job block's normal onClick handler.
//
// Drop targets are any DOM node carrying both `data-day` (yyyy-mm-dd) and
// `data-hour` (int) attributes. We resolve the target via document.elementFromPoint
// at pointerup, so cells don't need their own pointer handlers.
const DRAG_THRESHOLD = 6;
function useDragReschedule({ onDrop }) {
  const [drag, setDrag] = useState(null); // { job, x, y } during drag, null otherwise
  const startRef     = useRef(null);
  // After a drag completes, a synthetic click fires — we need to swallow it
  // so onJobClick (which opens the detail modal) doesn't fire on drop.
  const justDragged  = useRef(false);

  // Belt-and-suspenders cleanup: if the user alt-tabs away or switches
  // browser tabs mid-drag, pointerup may never fire and startRef would
  // stay populated forever (so the next pointerdown would behave weird).
  // Reset on window blur + visibilitychange to keep state sane.
  useEffect(() => {
    const reset = () => {
      if (startRef.current || drag) {
        startRef.current = null;
        setDrag(null);
      }
    };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [drag]);

  const beginPress = (job, e) => {
    if (e.button === 2) return;
    // If a previous drag never cleaned up (defensive — shouldn't happen with
    // the blur/visibility cleanup above), don't let the new press inherit it.
    startRef.current = {
      job,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    const s = startRef.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.started && Math.hypot(dx, dy) > DRAG_THRESHOLD) s.started = true;
    if (s.started) {
      // Compute the hover-target cell ONCE per move event (instead of having
      // every WeekView cell call elementFromPoint on every render — that was
      // 91 calls per frame on an iPad, causing visible jank).
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest?.('[data-day][data-hour]');
      const overDay  = cell?.getAttribute('data-day')   || null;
      const overHour = cell ? parseInt(cell.getAttribute('data-hour'), 10) : null;
      setDrag({ job: s.job, x: e.clientX, y: e.clientY, overDay, overHour });
    }
  };

  const onUp = (e) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    if (!s.started) { setDrag(null); return; }   // tap, not drag — fall through

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest?.('[data-day][data-hour]');
    if (cell && onDrop) {
      onDrop(s.job, cell.getAttribute('data-day'), parseInt(cell.getAttribute('data-hour'), 10));
    }
    setDrag(null);
    // Tell the very next click to bug off.
    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 0);
  };

  // Returns props to spread onto a draggable job block. Wrap your onClick
  // through `wrapClick` so post-drag clicks get suppressed cleanly.
  const dragProps = (job) => ({
    onPointerDown:   (e) => beginPress(job, e),
    onPointerMove:   onMove,
    onPointerUp:     onUp,
    onPointerCancel: () => { startRef.current = null; setDrag(null); },
    style: { touchAction: 'none' },
  });

  const wrapClick = (handler) => (e) => {
    if (justDragged.current) { e.preventDefault(); e.stopPropagation(); return; }
    handler?.(e);
  };

  return { drag, dragProps, wrapClick };
}

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

// ─── PHOTO TILE ──────────────────────────────────────────────────────────────
// A single photo card in the JobDetailModal grid: image at top, label pill
// + delete button overlaid on the image, caption row below. Designed for
// thumb-friendly tap targets so a tech in the field can label and caption
// shots without fiddly precision.
const PHOTO_LABEL_STYLES = {
  before: { label: 'Before', bg: 'rgba(220, 252, 231, 0.95)', fg: '#166534' },
  after:  { label: 'After',  bg: 'rgba(254, 215, 170, 0.95)', fg: '#9a3412' },
  other:  { label: 'Other',  bg: 'rgba(255, 255, 255, 0.92)', fg: '#475569' },
};

function PhotoTile({ photo, onView, onCycleLabel, onSetCaption, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(photo.caption || '');
  const labelInfo = PHOTO_LABEL_STYLES[photo.label || 'other'];

  // Sync the draft if the parent's caption value changes (e.g. another tile
  // caused a re-render with the saved value).
  useEffect(() => {
    if (!editing) setDraft(photo.caption || '');
  }, [photo.caption, editing]);

  const commitCaption = () => {
    setEditing(false);
    if ((photo.caption || '') !== draft) onSetCaption(draft);
  };

  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden',
      background: '#fff', border: '1px solid #e8e8e8',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Image area + overlays */}
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#f5f5f5' }}>
        <img
          src={photo.url}
          alt={photo.caption || 'Job photo'}
          onClick={onView}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
        />

        {/* Label pill — tap to cycle Before → After → Other */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCycleLabel(); }}
          title="Tap to change label"
          style={{
            position: 'absolute', top: 6, left: 6,
            background: labelInfo.bg, color: labelInfo.fg,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '4px 9px', borderRadius: 4, border: 'none', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          }}
        >{labelInfo.label}</button>

        {/* Delete × — top right */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Remove photo"
          style={{
            position: 'absolute', top: 4, right: 4,
            // 44×44 tap target (Apple's minimum) with the visible × inset
            // via padding so the icon still looks compact.
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.75)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* Caption row — click to edit inline */}
      <div style={{ padding: '6px 10px', minHeight: 32, display: 'flex', alignItems: 'center' }}>
        {editing ? (
          <input
            type="text"
            value={draft}
            autoFocus
            placeholder="Add a caption…"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitCaption}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCaption();
              if (e.key === 'Escape') { setDraft(photo.caption || ''); setEditing(false); }
            }}
            style={{
              width: '100%', border: 'none', outline: 'none',
              fontSize: 12, fontFamily: 'inherit', color: '#333',
              padding: 0, background: 'transparent',
            }}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            title="Tap to add a caption"
            style={{
              width: '100%', cursor: 'text',
              fontSize: 12,
              color: photo.caption ? '#333' : '#aaa',
              fontStyle: photo.caption ? 'normal' : 'italic',
              fontWeight: photo.caption ? 500 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {photo.caption || '+ caption'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── JOB DETAIL MODAL ────────────────────────────────────────────────────────
export function JobDetailModal({ job, techs, onClose, onStatusChange, onCreateInvoice, onPhotosChange, userId, isTech = false }) {
  useEscapeClose(onClose);
  const tech = techs.find(t => t.id === job.techUserId);
  const sc = STATUS_COLORS[job.status] || STATUS_COLORS.scheduled;
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState('');
  const [lightbox,  setLightbox]    = useState(null);  // url being viewed full-size
  const fileInputRef = useRef(null);

  const photos = Array.isArray(job.photos) ? job.photos : [];

  const handlePickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';   // reset so re-picking the same file still fires onChange
    if (!files.length || !userId) return;
    setUploadErr('');
    setUploading(true);
    try {
      // Upload sequentially so one failure doesn't take down the whole batch.
      const newEntries = [];
      for (const f of files) {
        try {
          // Compress on the device before sending up — drops a 5 MB phone
          // photo to ~400 KB without visible quality loss. See lib/imageCompress.
          const compressed = await compressImage(f);
          const url = await uploadJobPhoto(userId, job.id, compressed);
          newEntries.push({
            url,
            label:   'other',     // Before / After / Other — owner or tech can change later
            caption: null,        // optional free-text label like "Kitchen sink"
            addedBy: userId,
            addedAt: new Date().toISOString(),
          });
        } catch (innerErr) {
          console.error('photo upload failed', f.name, innerErr);
          setUploadErr(innerErr?.message || `Couldn't upload ${f.name}`);
        }
      }
      if (newEntries.length && onPhotosChange) {
        await onPhotosChange([...photos, ...newEntries]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm('Remove this photo?')) return;
    // Best-effort storage cleanup; if it fails, the metadata removal still wins.
    deleteJobPhoto(photo.url).catch(() => {});
    if (onPhotosChange) await onPhotosChange(photos.filter(p => p.url !== photo.url));
  };

  // Label pill cycles through: Before → After → Other → Before. One tap to
  // change keeps the iPad-friendly "everything is a tap target" feel.
  const cycleLabel = (photo) => {
    const order = ['before', 'after', 'other'];
    const cur   = photo.label || 'other';
    const next  = order[(order.indexOf(cur) + 1) % order.length];
    if (onPhotosChange) onPhotosChange(photos.map(x => x.url === photo.url ? { ...x, label: next } : x));
  };

  const setCaption = (photo, caption) => {
    const trimmed = (caption || '').trim();
    if (onPhotosChange) onPhotosChange(photos.map(x => x.url === photo.url ? { ...x, caption: trimmed || null } : x));
  };

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: COLORS.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, zIndex: 1 },
    closeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)' }}>{job.clientName}</div>
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

          {/* Photos — owner + tech can both add/remove. Tap a thumbnail to view full size. */}
          <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={s.label}>
                Photos {photos.length > 0 && <span style={{ color: '#666', fontWeight: 600 }}>({photos.length})</span>}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  background: COLORS.green, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer',
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? 'Uploading…' : '+ Add Photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handlePickFiles}
              />
            </div>
            {uploadErr && <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>{uploadErr}</div>}
            {photos.length === 0 && !uploading ? (
              <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>
                No photos yet. Snap before/after shots to attach to the eventual invoice.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {photos.map((p, i) => (
                  <PhotoTile
                    key={p.url || i}
                    photo={p}
                    onView={() => setLightbox(p.url)}
                    onCycleLabel={() => cycleLabel(p)}
                    onSetCaption={(cap) => setCaption(p, cap)}
                    onDelete={() => handleDeletePhoto(p)}
                  />
                ))}
              </div>
            )}
          </div>

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

      {/* Full-size photo viewer — click anywhere to dismiss. Lives at modal level
          so it sits above everything else and can use the overlay backdrop. */}
      {lightbox && (
        <div
          onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0, 0, 0, 0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <img
            src={lightbox}
            alt="Job photo"
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 6 }}
          />
        </div>
      )}
    </div>
  );
}

// ─── ADD JOB MODAL ────────────────────────────────────────────────────────────
function AddJobModal({ techs, jobs = [], onClose, onAdd, defaultDate, prefill = null, timeOff = [] }) {
  useEscapeClose(onClose);
  // `prefill` lets the parent seed the form (e.g. when scheduling from a recurring plan).
  // The plan's defaults — title, client name, trade, default tech, default duration, planId, target date —
  // flow straight into the initial form state. The user can still override anything before saving.
  const [form, setForm] = useState(() => {
    const base = {
      title: '', clientName: '', address: '', phone: '', notes: '',
      techUserId: techs[0]?.id || null, date: defaultDate || new Date(),
      startHour: 9, duration: 2, trade: 'Plumber', status: 'scheduled',
      planId: null, clientId: null,
    };
    if (!prefill) return base;
    return {
      ...base,
      title:      prefill.title       ?? base.title,
      clientName: prefill.clientName  ?? base.clientName,
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
    if (!form.clientName.trim()) return null;
    const needle = form.clientName.trim().toLowerCase();
    return jobs
      .filter(j => (j.clientName || '').toLowerCase() === needle && j.techUserId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
  }, [form.clientName, jobs]);

  const avgDurationForTitle = useMemo(() => {
    if (!form.title.trim()) return null;
    const needle = form.title.trim().toLowerCase();
    const matches = jobs.filter(j => (j.title || '').toLowerCase().includes(needle) && j.duration > 0);
    if (matches.length === 0) return null;
    const avg = matches.reduce((s, j) => s + j.duration, 0) / matches.length;
    return Math.round(avg * 2) / 2; // nearest 0.5 hr
  }, [form.title, jobs]);

  // Auto-apply suggestions only if the user hasn't manually overridden the field.
  // Use refs (synchronous, no re-render lag) so the user-touched flag is reliable
  // across the dirty-vs-suggestion race; previously the effect could fire before
  // setTechDirty(true) had committed and stomp the user's chosen tech.
  const techDirty     = useRef(false);
  const durationDirty = useRef(false);
  const tradeDirty    = useRef(false);

  useEffect(() => {
    if (lastJobForClient && !techDirty.current) {
      setForm(p => ({ ...p, techUserId: lastJobForClient.techUserId }));
    }
    if (lastJobForClient && !tradeDirty.current && lastJobForClient.trade) {
      setForm(p => ({ ...p, trade: lastJobForClient.trade }));
    }
  }, [lastJobForClient]);

  useEffect(() => {
    if (avgDurationForTitle && !durationDirty.current) {
      setForm(p => ({ ...p, duration: avgDurationForTitle }));
    }
  }, [avgDurationForTitle]);

  const lastTechName = lastJobForClient ? techs.find(t => t.id === lastJobForClient.techUserId)?.name : null;
  const lastJobDate  = lastJobForClient ? new Date(lastJobForClient.date).toLocaleDateString() : null;

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: COLORS.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body: { padding: '20px 24px' },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block', marginTop: 14 },
    // 16px font + 44px min height — iOS Safari otherwise zooms the page on
    // input focus, and tap targets <44pt are unreliable with gloved fingers.
    input: { width: '100%', padding: '12px 14px', fontSize: 16, minHeight: 44, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px 14px', fontSize: 16, minHeight: 44, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary) => ({ flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : '1px solid #ddd', background: primary ? COLORS.green : '#fff', color: primary ? '#fff' : '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
  };

  const handleAdd = () => {
    if (!form.title || !form.clientName) return;
    onAdd({ ...form, id: Date.now() });
    onClose();
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Schedule New Job</span>
          <button style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: 22, flexShrink: 0 }} onClick={onClose}>×</button>
        </div>
        <div style={s.body}>
          <label style={s.label}>Job Title</label>
          <input style={s.input} placeholder="e.g. Faucet Repair" value={form.title} onChange={e => update('title', e.target.value)} />
          {avgDurationForTitle && !durationDirty.current && (
            <div style={{ fontSize: 12, color: COLORS.green, marginTop: 4 }}>
              Auto-set duration to {avgDurationForTitle} hr (avg of similar jobs)
            </div>
          )}
          <label style={s.label}>Client Name</label>
          <input style={s.input} placeholder="John Miller" value={form.clientName} onChange={e => update('clientName', e.target.value)} />
          {lastTechName && !techDirty.current && (
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
              <select style={s.select} value={form.trade} onChange={e => { update('trade', e.target.value); tradeDirty.current = true; }}>
                {['Plumber','HVAC','Electrician','Roofing','Specialty'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Assigned Tech</label>
              <select style={s.select} value={form.techUserId || ''} onChange={e => { update('techUserId', e.target.value || null); techDirty.current = true; }}>
                <option value="">Unassigned</option>
                {techs.map(t => {
                  // Compute the iso day for the currently-selected job date so we can
                  // grey out techs that are off. Owner can still pick them (browsers
                  // ignore disabled in some cases) but the visual cue is what matters.
                  const dayIso = (form.date instanceof Date ? form.date : new Date(form.date))
                    .toISOString().split('T')[0];
                  const off = isTechOffOn(timeOff, t.id, dayIso);
                  return (
                    <option key={t.id} value={t.id} disabled={off}>
                      {t.name}{off ? ' — off this day' : ''}
                    </option>
                  );
                })}
              </select>
              {/* Inline warning if the currently-selected tech is off on the selected date. */}
              {form.techUserId && (() => {
                const dayIso = (form.date instanceof Date ? form.date : new Date(form.date))
                  .toISOString().split('T')[0];
                return isTechOffOn(timeOff, form.techUserId, dayIso);
              })() && (
                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4, fontWeight: 600 }}>
                  This tech is off on the selected date.
                </div>
              )}
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
              <select style={s.select} value={form.duration} onChange={e => { update('duration', parseFloat(e.target.value)); durationDirty.current = true; }}>
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
// Format a Date as yyyy-mm-dd for cell drop-target attributes (local time, not UTC,
// so a Saturday 11pm doesn't accidentally write itself into Sunday).
const isoLocalDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function WeekView({ weekDays, jobs, techs, onJobClick, filterTech, onReschedule, isTech }) {
  const filtered = filterTech ? jobs.filter(j => j.techUserId === filterTech) : jobs;
  const { drag, dragProps, wrapClick } = useDragReschedule({ onDrop: onReschedule });

  // Detect portrait orientation so the week view can tighten itself for narrow
  // viewports (iPad portrait = 768 wide, 7 day columns get ~97px each — every
  // saved pixel matters).
  const isPortrait = typeof window !== 'undefined' && window.innerWidth < window.innerHeight;

  const s = {
    wrap: { overflowX: 'auto', position: 'relative' },
    // Time column drops 60→44 in portrait (gives 16 more px back to day cols).
    grid: { display: 'grid', gridTemplateColumns: isPortrait ? '44px repeat(7, 1fr)' : '60px repeat(7, 1fr)', minWidth: isPortrait ? 600 : 700 },
    dayHeader: (isToday) => ({ padding: isPortrait ? '8px 4px' : '10px 8px', textAlign: 'center', background: isToday ? COLORS.greenLight : '#fafafa', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #f0f0f0' }),
    dayName: (isToday) => ({ fontSize: isPortrait ? 10 : 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: isToday ? COLORS.green : '#aaa' }),
    dayNum: (isToday) => ({ fontSize: isPortrait ? 18 : 22, fontWeight: 900, color: isToday ? COLORS.green : '#111', marginTop: 2 }),
    timeCol: { fontSize: isPortrait ? 10 : 11, color: '#bbb', textAlign: 'right', paddingRight: isPortrait ? 4 : 8, paddingTop: 4, borderRight: '1px solid #e8e8e8' },
    cell: { borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #f8f8f8', minHeight: 56, position: 'relative' },
    jobBlock: (color) => ({ position: 'absolute', left: 2, right: 2, background: color, borderRadius: 6, padding: isPortrait ? '3px 4px' : '4px 6px', cursor: isTech ? 'pointer' : 'grab', overflow: 'hidden', zIndex: 1, userSelect: 'none' }),
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
          <React.Fragment key={`row-${hour}`}>
            <div style={{ ...s.timeCol, height: 56, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4, fontSize: 11, color: '#bbb', borderRight: '1px solid #e8e8e8', borderBottom: '1px solid #f8f8f8' }}>
              {formatTime(hour)}
            </div>
            {weekDays.map((day, di) => {
              const dayJobs = getJobsForDayHour(day, hour);
              const isToday = isSameDay(day, today);
              const dayIso  = isoLocalDate(day);
              // Highlight the cell beneath the dragged pointer so the user can
              // see exactly where the job will land before they release.
              // Cheap equality check now that the hook computes the hover
              // target once per pointermove rather than per cell per frame.
              const isDropHover = drag && drag.overDay === dayIso && drag.overHour === hour;
              return (
                <div
                  key={`cell-${hour}-${di}`}
                  data-day={dayIso}
                  data-hour={hour}
                  style={{
                    ...s.cell,
                    background: isDropHover
                      ? '#dcfce7'
                      : isToday ? '#fafff9' : '#fff',
                    boxShadow: isDropHover ? `inset 0 0 0 2px ${COLORS.green}` : 'none',
                    height: 56,
                  }}
                >
                  {dayJobs.map(job => {
                    // Hide the original block while it's being dragged so only the ghost shows.
                    const isBeingDragged = drag && drag.job.id === job.id;
                    // Techs don't get drag handles — view-only schedule for them.
                    const draggable = !isTech;
                    // Overdue treatment: scheduled jobs whose date is in the past get a
                    // light-red wash with a red left bar. Without overriding the text
                    // colors here, the white-on-color labels become invisible against
                    // the pink. We swap to dark-red text so it stays readable.
                    const isOverdue = job.status === 'scheduled' && new Date(job.date) < new Date(new Date().toDateString());
                    const titleColor  = isOverdue ? '#991b1b' : '#fff';
                    const subtleColor = isOverdue ? '#b91c1c' : 'rgba(255,255,255,.8)';
                    return (
                      <div
                        key={job.id}
                        {...(draggable ? dragProps(job) : {})}
                        style={{
                          ...s.jobBlock(getTechColor(job.techUserId)),
                          top: 2,
                          height: job.duration * 56 - 4,
                          opacity: isBeingDragged ? 0.25 : (job.status === 'cancelled' ? 0.35 : job.status === 'completed' ? 0.6 : 1),
                          ...(isOverdue ? { background: '#fef2f2', borderLeft: '3px solid #dc2626' } : {}),
                          ...(draggable ? dragProps(job).style : {}),
                        }}
                        onClick={wrapClick(() => onJobClick(job))}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: titleColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: subtleColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.clientName}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Floating ghost — follows the cursor while dragging.
          position:fixed so it isn't clipped by the scrollable grid. */}
      {drag && (
        <div style={{
          position: 'fixed',
          left: drag.x + 12,
          top:  drag.y + 12,
          background: getTechColor(drag.job.techUserId),
          color: '#fff',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 700,
          pointerEvents: 'none',
          zIndex: 2000,
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.25)',
          maxWidth: 220,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {drag.job.title}
        </div>
      )}
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
                // See WeekView: when the overdue treatment kicks in we swap text
                // colors to dark red so the labels survive on the pink wash.
                const isOverdue = job.status === 'scheduled' && new Date(job.date) < new Date(new Date().toDateString());
                const titleColor  = isOverdue ? '#991b1b' : '#fff';
                const subtleColor = isOverdue ? '#b91c1c' : 'rgba(255,255,255,.85)';
                const dimColor    = isOverdue ? '#b91c1c' : 'rgba(255,255,255,.7)';
                const chipBg      = isOverdue ? 'rgba(185, 28, 28, 0.12)' : 'rgba(255,255,255,.15)';
                const initialsBg  = isOverdue ? 'rgba(185, 28, 28, 0.15)' : 'rgba(255,255,255,.25)';
                return (
                  <div key={job.id} style={{ ...s.jobBlock(getTechColor(job.techUserId)), top: 4, height: job.duration * 72 - 8, opacity: job.status === 'cancelled' ? 0.35 : job.status === 'completed' ? 0.6 : 1, ...(isOverdue ? { background: '#fef2f2', borderLeft: '3px solid #dc2626' } : {}) }} onClick={() => onJobClick(job)}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: titleColor, marginBottom: 2 }}>{job.title}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: subtleColor }}>{job.clientName} · {job.address.split(',')[0]}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: dimColor, marginTop: 2 }}>{formatTime(job.startHour)} — {formatTime(job.startHour + job.duration)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: initialsBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: titleColor }}>{tech?.initials}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: dimColor, background: chipBg, padding: '2px 6px', borderRadius: 4 }}>{job.trade}</div>
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
  // Time-off wiring — list of all time-off entries. Used to:
  //  1. Disable off techs in the AddJobModal dropdown for the chosen date.
  //  2. Warn the owner before drag-rescheduling a job onto an off-day.
  //  3. Show "Off MM/DD–MM/DD" tags under each tech in the filter sidebar.
  timeOff = [],
}) {
  // When the signed-in user's role is 'tech', this screen becomes their personal
  // "My Schedule" — filtered to only jobs assigned to them, with no add/reassign UI.
  // Owners see everything across the company and can create + reassign.
  const isTech = user?.role === 'tech';
  const { isTablet } = useBreakpoint();

  const [view, setView] = useState('week'); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allJobs, setAllJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [filterTech, setFilterTech] = useState(null);
  const [addJobDate, setAddJobDate] = useState(null);
  // On tablet (iPad portrait) the sidebar would cover half the calendar.
  // Default it to collapsed there — the user can tap a "Show details" toggle
  // to slide it in.
  const [sidebarOpen, setSidebarOpen] = useState(!isTablet);

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

  // Persist a new photos array for a job (called after add or remove).
  // Keeps both the master jobs list and the currently-open detail modal in sync.
  const handleJobPhotosChange = async (jobId, photos) => {
    if (!user?.id) return;
    const target = jobs.find(j => j.id === jobId);
    if (!target) return;
    const optimistic = { ...target, photos };
    setJobs(prev => prev.map(j => j.id === jobId ? optimistic : j));
    setSelectedJob(prev => prev && prev.id === jobId ? optimistic : prev);
    try {
      const saved = await upsertJob(user.id, optimistic);
      setJobs(prev => prev.map(j => j.id === saved.id ? saved : j));
      setSelectedJob(prev => prev && prev.id === saved.id ? saved : prev);
    } catch (e) {
      console.error('photos save failed', e);
      alert(e?.message || 'Could not save photos.');
    }
  };

  // Drag-and-drop reschedule. `dayIso` is yyyy-mm-dd (local), `hour` is 0-23.
  // We update local state optimistically, then persist via upsertJob. If the
  // save fails we roll back so the calendar doesn't lie about server state.
  const handleReschedule = async (job, dayIso, hour) => {
    // Skip the no-op case (drop in same cell) so we don't make a useless write.
    const sameDay = isSameDay(new Date(job.date), new Date(dayIso + 'T12:00:00'));
    if (sameDay && job.startHour === hour) return;
    if (!user?.id) return;

    // If the assigned tech is off on the new date, give the owner a chance to
    // back out before we save the move. They can still confirm if they're
    // intentionally moving past the constraint.
    if (job.techUserId && isTechOffOn(timeOff, job.techUserId, dayIso)) {
      const techName = team.find(t => (t.userId || t.id) === job.techUserId)?.name || 'this tech';
      const ok = window.confirm(`${techName} is off on ${dayIso}. Move the job anyway?`);
      if (!ok) return;
    }

    const newDate = new Date(dayIso + 'T12:00:00');
    const optimistic = { ...job, date: newDate, startHour: hour };
    const original   = job;
    setJobs(prev => prev.map(j => j.id === job.id ? optimistic : j));

    try {
      const saved = await upsertJob(user.id, optimistic);
      setJobs(prev => prev.map(j => j.id === saved.id ? saved : j));
    } catch (e) {
      console.error('reschedule failed', e);
      setJobs(prev => prev.map(j => j.id === original.id ? original : j));
      alert('Could not move that job — restored.');
    }
  };

  const handleDayClick = (date) => {
    setCurrentDate(date);
    setView('day');
  };

  // Memoize so child sidebars don't re-render on every parent state change
  // (e.g. drag-ghost position updates fire 60+ times/sec during a drag).
  const todayJobs = useMemo(
    () => jobs.filter(j => isSameDay(j.date, new Date())),
    [jobs]
  );
  const upcomingJobs = useMemo(
    () => jobs.filter(j => j.date > new Date() && j.status !== 'cancelled').slice(0, 5),
    [jobs]
  );

  const headerTitle = () => {
    if (view === 'month') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') return `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()} — ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`;
    return formatDate(currentDate);
  };

  const s = {
    // On tablet the parent gives us flex: 1 with a fixed viewport height —
    // claim it via height: 100% + flex column so the body row can use flex: 1
    // and the calendar fills the rest of the screen below the chrome.
    wrap: isTablet
      ? { height: '100%', background: '#f7f7f5', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', margin: '-14px -16px' }
      : { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
    title: { fontSize: 20, fontWeight: 800, color: '#111' },
    addBtn: { padding: '10px 18px', minHeight: 44, background: COLORS.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
    toolbar: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
    navBtn: { background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 12px', minHeight: 44, minWidth: 44, cursor: 'pointer', fontSize: 16, color: '#666' },
    dateLabel: { fontSize: 15, fontWeight: 700, color: '#111', minWidth: 200, textAlign: 'center' },
    viewBtns: { display: 'flex', gap: 4 },
    viewBtn: (active) => ({ padding: '10px 14px', minHeight: 44, borderRadius: 8, border: 'none', background: active ? COLORS.green : '#f0f0f0', color: active ? '#fff' : '#666', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer' }),
    // Body — laptop uses calc(100vh - chrome). Tablet uses flex: 1 to fill
    // whatever's left under the combined header bar.
    body: {
      display: 'grid',
      gridTemplateColumns: isTablet ? '1fr' : (sidebarOpen ? '1fr 280px' : '1fr'),
      gap: 0,
      ...(isTablet
        ? { flex: 1, minHeight: 0 }
        : { height: 'calc(100vh - 200px)' }),
      position: 'relative',
    },
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
      {isTablet ? (
        // Single combined bar on tablet — title + nav + view picker + Add Job
        // in one row so the calendar gets every spare pixel below.
        <div style={{
          background: '#fff', borderBottom: '1px solid #e8e8e8',
          padding: '8px 12px', display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#111', marginRight: 4 }}>
            {isTech ? 'My Schedule' : 'Schedule'}
          </span>
          <button style={s.navBtn} onClick={() => navigate(-1)}>‹</button>
          <button style={{ ...s.navBtn, fontSize: 13, padding: '8px 12px' }} onClick={() => setCurrentDate(new Date())}>Today</button>
          <button style={s.navBtn} onClick={() => navigate(1)}>›</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111', flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 80 }}>
            {headerTitle()}
          </span>
          <div style={s.viewBtns}>
            {['month', 'week', 'day'].map(v => (
              <button key={v} style={s.viewBtn(view === v)} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {/* Sidebar toggle lives in the header bar (was a floating button
              before — overlapped Saturday's column header). */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              padding: '10px 12px', minHeight: 44,
              background: sidebarOpen ? COLORS.green : '#f0f0f0',
              color: sidebarOpen ? '#fff' : '#666',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >{sidebarOpen ? 'Hide ✕' : 'Details'}</button>
          {!isTech && (
            <button style={{ ...s.addBtn, padding: '10px 14px', fontSize: 13, marginLeft: 4 }} onClick={() => { setAddJobDate(currentDate); setShowAddJob(true); }}>Schedule Job</button>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Body */}
      <div style={s.body}>
        <div style={s.calendar}>
          {view === 'month' && <MonthView date={currentDate} jobs={jobs} techs={techs} onJobClick={setSelectedJob} filterTech={filterTech} onDayClick={handleDayClick} />}
          {view === 'week' && <WeekView weekDays={weekDays} jobs={jobs} techs={techs} onJobClick={setSelectedJob} filterTech={filterTech} onReschedule={handleReschedule} isTech={isTech} />}
          {view === 'day' && <DayView date={currentDate} jobs={jobs} techs={techs} onJobClick={setSelectedJob} filterTech={filterTech} />}
        </div>

        {/* Sidebar — on tablet this slides in as an overlay (sidebar covers
            the right 280px of the calendar instead of pushing it). On laptop
            it sits inline as a column. */}
        {(sidebarOpen || !isTablet) && (
        <div style={{
          ...s.sidebar,
          ...(isTablet ? {
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 320,
            zIndex: 10, boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
          } : {}),
        }}>
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
                // Surface any time-off entries that overlap the visible week so the
                // owner sees who's out at a glance without leaving the schedule.
                const weekStartIso = isoLocalDate(weekDays[0]);
                const weekEndIso   = isoLocalDate(weekDays[6]);
                const offThisWeek  = timeOffInRange(timeOff, tech.id, weekStartIso, weekEndIso);
                const fmtMd = (iso) => {
                  if (!iso) return '';
                  const d = new Date(iso + 'T12:00:00');
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                };
                return (
                  <button key={tech.id} style={s.techBtn(filterTech === tech.id, tech.color)} onClick={() => setFilterTech(filterTech === tech.id ? null : tech.id)}>
                    <div style={s.techDot(tech.color)} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                      <span style={s.techName}>{tech.name}</span>
                      {offThisWeek.length > 0 && (
                        <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700, marginTop: 1 }}>
                          Off {offThisWeek.map(t => `${fmtMd(t.startDate)}–${fmtMd(t.endDate)}`).join(', ')}
                        </span>
                      )}
                    </div>
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
                  <div style={s.upcomingMeta}>{job.clientName} · {formatTime(job.startHour)}</div>
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
                <div style={s.upcomingMeta}>{job.clientName} · {formatDate(job.date)}</div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Sidebar toggle is in the compact header bar above (tablet only) —
            avoids overlap with the calendar's day-column headers. */}
      </div>

      {/* Modals */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          techs={techs}
          isTech={isTech}
          userId={user?.id}
          onPhotosChange={(photos) => handleJobPhotosChange(selectedJob.id, photos)}
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
          timeOff={timeOff}
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
