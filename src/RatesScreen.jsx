// Rates — build a labor rate the way an estimator actually does it:
// wage + burden lines + overhead + profit (additive, on the base wage),
// three time portions (ST / OT / DT), per build-up group (Direct/Indirect),
// blended into a manpower composite, published as a client rate sheet.
//
// Math lives in lib/rateMath.js (unit-tested against a real industrial
// T&M bid workbook — scripts/test-rate-math.mjs). This file is UI +
// row-level persistence only: every edit updates local state instantly
// and debounces a save of just the touched row.

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  RATE_TEMPLATES, listRateSheets, loadRateSheet, createRateSheet,
  updateRateSheet, deleteRateSheet, updateRateGroup,
  addBurdenLine, updateBurdenLine, deleteBurdenLine,
  addRateCraft, updateRateCraft, deleteRateCraft,
  addRateEquipment, updateRateEquipment, deleteRateEquipment,
} from "./data/rates";
import {
  burdenSum, stRate, otRate, dtRate, groupComposite, projectComposite, perDiemHourly,
} from "./lib/rateMath";
import { useEscapeClose } from "./lib/useEscapeClose";
import { useBreakpoint } from "./lib/useBreakpoint";

// Palette aligned with the app (own copy so this stays independently lazy-loadable).
const C = {
  bg: '#f3f6f4', surface: '#ffffff', raised: '#f4f8f6',
  border: '#e6ede9', border2: '#cfdfd6',
  green: '#2d6a4f', greenLo: '#eef7f2', greenMd: '#b7dfca',
  accent: '#ea580c', accentLo: '#fff4ed',
  text: '#0f172a', muted: '#475569', dim: '#64748b',
  success: '#15803d', errorBold: '#b91c1c', errorLo: '#fef2f2',
  warn: '#d97706', warnLo: '#fef3c7',
  shadow1: '0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.03)',
};

const money = (v) => '$' + (Number.isFinite(Number(v)) ? Number(v) : 0)
  .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctS = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(2) + '%';

// ── Small shared bits ────────────────────────────────────────────────────────

const card  = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadow1, marginBottom: 16, overflow: 'hidden' };
const cardH = { padding: '15px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' };
const cardB = { padding: '16px 18px' };
const lbl   = { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, margin: '0 0 9px' };
// Spreadsheet-style grid: every cell bordered on the right and bottom, tight
// rows, tabular numerals — deliberately close to the Excel workbook this
// feature was modeled on, because that's what estimators already know.
const thS   = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.dim, textAlign: 'left', padding: '7px 9px', background: C.raised, borderBottom: `1px solid ${C.border2}`, borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap', verticalAlign: 'bottom' };
const tdS   = { padding: '3px 9px', borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, fontSize: 13.5 };
const tdR   = { ...tdS, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
// Frozen label column, like Excel's frozen pane. Needs an explicit background
// per row tone so content scrolling under it doesn't show through.
const tdFrozen = (bg = C.surface) => ({ ...tdS, position: 'sticky', left: 0, background: bg, zIndex: 1, borderRight: `1.5px solid ${C.border2}`, minWidth: 170 });

const Btn = ({ children, onClick, variant = 'plain', style = {}, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 16px', minHeight: 38,
    borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1,
    ...(variant === 'primary'
      ? { background: C.green, color: '#fff', border: `1px solid ${C.green}` }
      : variant === 'ghost'
      ? { background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }
      : { background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: C.shadow1 }),
    ...style,
  }}>{children}</button>
);

// Excel-cell behavior: reads as a plain value until you hover or click into it.
const NumIn = ({ value, onChange, w = 74, step = '0.5', ariaLabel }) => (
  <input type="number" value={value} step={step} min="0" aria-label={ariaLabel || 'value'}
    onChange={(e) => onChange(e.target.value)}
    onFocus={(e) => { e.target.style.border = `1.5px solid ${C.green}`; e.target.style.background = C.surface; }}
    onBlur={(e)  => { e.target.style.border = '1.5px solid transparent'; e.target.style.background = 'transparent'; }}
    onMouseEnter={(e) => { if (document.activeElement !== e.target) e.target.style.border = `1.5px solid ${C.border2}`; }}
    onMouseLeave={(e) => { if (document.activeElement !== e.target) e.target.style.border = '1.5px solid transparent'; }}
    style={{ fontFamily: 'inherit', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', textAlign: 'right',
      padding: '3px 5px', border: '1.5px solid transparent', borderRadius: 5, background: 'transparent',
      color: C.text, width: w, MozAppearance: 'textfield' }} />
);

const TextIn = ({ value, onChange, placeholder, center, minW = 130, bold = true }) => (
  <input type="text" value={value} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    style={{ fontFamily: 'inherit', fontSize: center ? 12.5 : 14, fontWeight: bold ? 650 : 500,
      padding: '5px 8px', border: '1px solid transparent', borderRadius: 7, background: 'transparent',
      color: C.text, width: '100%', minWidth: minW, textAlign: center ? 'center' : 'left' }}
    onFocus={(e) => { e.target.style.border = `1px solid ${C.green}`; e.target.style.background = C.surface; }}
    onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }} />
);

const XBtn = ({ onClick, title }) => (
  <button onClick={onClick} title={title || 'Remove'} aria-label={title || 'Remove'} style={{
    fontFamily: 'inherit', fontSize: 16, lineHeight: 1, width: 26, height: 26, borderRadius: 7,
    border: '1px solid transparent', background: 'transparent', color: C.dim, cursor: 'pointer' }}>×</button>
);

const Check = ({ checked, onChange, ariaLabel }) => (
  <input type="checkbox" checked={checked} aria-label={ariaLabel}
    onChange={(e) => onChange(e.target.checked)}
    style={{ width: 17, height: 17, accentColor: C.green, cursor: 'pointer' }} />
);

const Strip = ({ items }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', border: `1px solid ${C.greenMd}`, background: C.greenLo, borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
    {items.map(([k, v, s], i) => (
      <div key={k} style={{ flex: '1 1 9rem', padding: '11px 14px', borderRight: i < items.length - 1 ? `1px solid ${C.greenMd}` : 'none' }}>
        <div style={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.green }}>{k}</div>
        <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 1 }}>{v}</div>
        {s && <div style={{ fontSize: 11.5, color: C.muted }}>{s}</div>}
      </div>
    ))}
  </div>
);

// ── New-sheet modal ──────────────────────────────────────────────────────────

function NewSheetModal({ onClose, onCreate }) {
  useEscapeClose(onClose);
  const [name, setName] = useState('');
  const [tpl, setTpl] = useState('demo');
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>New rate sheet</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: C.dim }}>
          Templates only insert starter rows — after that every line is yours to rename, reprice, or delete.
        </p>
        <label style={lbl}>Sheet name</label>
        <input autoFocus type="text" value={name} placeholder="e.g. 2026 T&M Rates — All Customers"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim() && !busy) { setBusy(true); onCreate(name.trim(), tpl); } }}
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 15, padding: '10px 12px', border: `1px solid ${C.border2}`, borderRadius: 8, marginBottom: 16 }} />
        <label style={lbl}>Start from</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {Object.entries(RATE_TEMPLATES).map(([key, t]) => (
            <button key={key} onClick={() => { setTpl(key); if (!name.trim() && t.suggestedName) setName(t.suggestedName); }} style={{
              textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', padding: '10px 13px', borderRadius: 9,
              border: `1.5px solid ${tpl === key ? C.green : C.border}`, background: tpl === key ? C.greenLo : C.surface }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>{t.label}</div>
              <div style={{ fontSize: 12.5, color: C.dim, marginTop: 2 }}>{t.description}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!name.trim() || busy}
            onClick={() => { setBusy(true); onCreate(name.trim(), tpl); }}>
            {busy ? 'Creating…' : 'Create sheet'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function RatesScreen({ user }) {
  const { isTablet } = useBreakpoint();
  const [sheets, setSheets] = useState([]);
  const [sheetId, setSheetId] = useState(null);
  const [sheet, setSheet] = useState(null);       // full: groups[], equipment[]
  const [tab, setTab] = useState('build');        // build | comp | doc | equip
  const [gi, setGi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saveTick, setSaveTick] = useState(0);    // bump = "saving…" indicator

  // Debounced per-row saves. Key → timer. Each save captures its own payload.
  const timers = useRef({});
  const queueSave = useCallback((key, fn) => {
    clearTimeout(timers.current[key]);
    setSaveTick((t) => t + 1);
    timers.current[key] = setTimeout(async () => {
      delete timers.current[key];
      try { await fn(); } catch (e) { setErr(e.message || 'Save failed'); }
      setSaveTick((t) => t + 1);
    }, 600);
  }, []);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  const savingCount = Object.keys(timers.current).length;

  const refreshList = useCallback(async () => {
    try {
      const list = await listRateSheets();
      setSheets(list);
      return list;
    } catch (e) { setErr(e.message || 'Could not load rate sheets'); return []; }
  }, []);

  const openSheet = useCallback(async (id) => {
    setLoading(true); setErr('');
    try {
      const full = await loadRateSheet(id);
      setSheet(full); setSheetId(id); setGi(0);
    } catch (e) { setErr(e.message || 'Could not load sheet'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const list = await refreshList();
      if (list.length) await openSheet(list[0].id);
      else setLoading(false);
    })();
  }, [refreshList, openSheet]);

  // ── Mutators: local state now, row save debounced ──
  const patchSheet = (patch) => {
    setSheet((s) => ({ ...s, ...patch }));
    queueSave('sheet', () => updateRateSheet(sheetId, { ...sheet, ...patch }));
  };
  const patchGroup = (idx, patch) => {
    setSheet((s) => {
      const groups = s.groups.map((g, i) => (i === idx ? { ...g, ...patch } : g));
      const g = groups[idx];
      queueSave(`group:${g.id}`, () => updateRateGroup(g.id, g));
      return { ...s, groups };
    });
  };
  const patchLine = (gIdx, lineId, patch) => {
    setSheet((s) => {
      const groups = s.groups.map((g, i) => i !== gIdx ? g : {
        ...g, lines: g.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
      });
      const l = groups[gIdx].lines.find((x) => x.id === lineId);
      queueSave(`line:${lineId}`, () => updateBurdenLine(lineId, l));
      return { ...s, groups };
    });
  };
  const patchCraft = (gIdx, craftId, patch) => {
    setSheet((s) => {
      const groups = s.groups.map((g, i) => i !== gIdx ? g : {
        ...g, crafts: g.crafts.map((c) => (c.id === craftId ? { ...c, ...patch } : c)),
      });
      const c = groups[gIdx].crafts.find((x) => x.id === craftId);
      queueSave(`craft:${craftId}`, () => updateRateCraft(craftId, c));
      return { ...s, groups };
    });
  };
  const patchEquip = (equipId, patch) => {
    setSheet((s) => {
      const equipment = s.equipment.map((e) => (e.id === equipId ? { ...e, ...patch } : e));
      const e = equipment.find((x) => x.id === equipId);
      queueSave(`equip:${equipId}`, () => updateRateEquipment(equipId, e));
      return { ...s, equipment };
    });
  };

  const handleAddLine = async (gIdx) => {
    const g = sheet.groups[gIdx];
    try {
      const row = await addBurdenLine(user.id, g.id, g.lines.length);
      setSheet((s) => ({ ...s, groups: s.groups.map((gg, i) => i === gIdx ? { ...gg, lines: [...gg.lines, row] } : gg) }));
    } catch (e) { setErr(e.message); }
  };
  const handleDeleteLine = async (gIdx, lineId) => {
    setSheet((s) => ({ ...s, groups: s.groups.map((g, i) => i === gIdx ? { ...g, lines: g.lines.filter((l) => l.id !== lineId) } : g) }));
    try { await deleteBurdenLine(lineId); } catch (e) { setErr(e.message); }
  };
  const handleAddCraft = async (gIdx) => {
    const g = sheet.groups[gIdx];
    try {
      const row = await addRateCraft(user.id, g.id, g.crafts.length);
      setSheet((s) => ({ ...s, groups: s.groups.map((gg, i) => i === gIdx ? { ...gg, crafts: [...gg.crafts, row] } : gg) }));
    } catch (e) { setErr(e.message); }
  };
  const handleDeleteCraft = async (gIdx, craftId) => {
    setSheet((s) => ({ ...s, groups: s.groups.map((g, i) => i === gIdx ? { ...g, crafts: g.crafts.filter((c) => c.id !== craftId) } : g) }));
    try { await deleteRateCraft(craftId); } catch (e) { setErr(e.message); }
  };
  const handleAddEquip = async () => {
    try {
      const row = await addRateEquipment(user.id, sheetId, sheet.equipment.length);
      setSheet((s) => ({ ...s, equipment: [...s.equipment, row] }));
    } catch (e) { setErr(e.message); }
  };
  const handleDeleteEquip = async (id) => {
    setSheet((s) => ({ ...s, equipment: s.equipment.filter((e) => e.id !== id) }));
    try { await deleteRateEquipment(id); } catch (e) { setErr(e.message); }
  };

  const handleCreate = async (name, tpl) => {
    setShowNew(false); setLoading(true);
    try {
      const id = await createRateSheet(user.id, name, tpl);
      await refreshList();
      await openSheet(id);
    } catch (e) { setErr(e.message || 'Could not create sheet'); setLoading(false); }
  };

  const handleDeleteSheet = async () => {
    if (!window.confirm(`Delete "${sheet.name}"? This removes the whole sheet — build-ups, crafts and equipment.`)) return;
    try {
      await deleteRateSheet(sheetId);
      setSheet(null); setSheetId(null);
      const list = await refreshList();
      if (list.length) await openSheet(list[0].id);
    } catch (e) { setErr(e.message); }
  };

  const handlePublish = () => patchSheet({ status: sheet.status === 'active' ? 'draft' : 'active' });

  // Techs never see this screen (nav hides it too — defense in depth).
  if (user?.role === 'tech') {
    return <div style={{ padding: 24, color: C.dim, fontSize: 15 }}>Rates are managed by the account owner.</div>;
  }

  if (loading) return <div style={{ padding: 24, color: C.dim, fontSize: 15 }}>Loading rates…</div>;

  // ── Empty state ──
  if (!sheet) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {showNew && <NewSheetModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🧮</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>Build your first rate sheet</h2>
          <p style={{ margin: '0 auto 20px', maxWidth: 440, fontSize: 14.5, color: C.muted }}>
            Wage → burden → overhead → profit → the rate you publish. The demo sheet
            is a worked example with round numbers — poke it, change anything, rename
            it into your real sheet, or delete it and start clean. Your company's
            burden structure, not ours.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn variant="primary" onClick={() => handleCreate('Demo Rate Sheet', 'demo')}>Try the demo sheet</Btn>
            <Btn onClick={() => setShowNew(true)}>+ New rate sheet</Btn>
          </div>
          {err && <div style={{ marginTop: 14, color: C.errorBold, fontSize: 13.5 }}>{err}</div>}
        </div>
      </div>
    );
  }

  const g = sheet.groups[gi] || sheet.groups[0];
  const groups = sheet.groups;

  // ── Derived numbers (all from rateMath — the one source of truth) ──
  const comps  = groups.map((gg) => groupComposite(gg));
  const proj   = projectComposite(groups);
  const pdHr   = perDiemHourly(sheet);

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} role="tab" aria-selected={tab === id} style={{
      padding: '8px 15px', borderRadius: 7, border: 'none', fontFamily: 'inherit',
      background: tab === id ? C.green : 'transparent', color: tab === id ? '#fff' : C.muted,
      fontSize: 14.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto' }}>
      {showNew && <NewSheetModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 3px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Rates</h2>
          <p style={{ margin: 0, color: C.dim, fontSize: 14.5 }}>Wage → burden → overhead → profit → the rate you publish.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {savingCount > 0 && <span style={{ fontSize: 12.5, color: C.dim }}>Saving…</span>}
          <select value={sheetId || ''} onChange={(e) => openSheet(e.target.value)} aria-label="Rate sheet"
            style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, color: C.text, maxWidth: 260 }}>
            {sheets.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status === 'active' ? ' ✓' : ''}</option>)}
          </select>
          <Btn onClick={() => setShowNew(true)}>+ New sheet</Btn>
          <Btn variant="primary" onClick={handlePublish}>
            {sheet.status === 'active' ? 'Published ✓' : 'Publish'}
          </Btn>
        </div>
      </div>

      {err && (
        <div style={{ background: C.errorLo, borderLeft: `3px solid ${C.errorBold}`, borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 13.5, marginBottom: 14 }}>
          {err} <button onClick={() => setErr('')} style={{ border: 'none', background: 'none', color: C.dim, cursor: 'pointer', fontFamily: 'inherit' }}>dismiss</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div role="tablist" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, width: 'fit-content', maxWidth: '100%' }}>
        {tabBtn('build', 'Build-up')}
        {tabBtn('comp',  'Composite')}
        {tabBtn('doc',   'Rate sheet')}
        {tabBtn('equip', 'Equipment')}
      </div>

      {/* ═══ BUILD-UP ═══ */}
      {tab === 'build' && (
        <div style={card}>
          <div style={cardH}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 750 }}>{g.name} build-up</h3>
              <div style={{ color: C.dim, fontSize: 13.5, marginTop: 2 }}>One percentage per line, applied across every craft. Additive on the base wage — never compounded.</div>
            </div>
            <div style={{ display: 'inline-flex', gap: 3, padding: 3, background: C.raised, border: `1px solid ${C.border}`, borderRadius: 99 }}>
              {groups.map((gg, i) => (
                <button key={gg.id} onClick={() => setGi(i)} aria-pressed={gi === i} style={{
                  fontFamily: 'inherit', fontSize: 13.5, fontWeight: 650, padding: '6px 16px', borderRadius: 99,
                  border: 'none', cursor: 'pointer',
                  background: gi === i ? C.green : 'transparent', color: gi === i ? '#fff' : C.muted }}>
                  {gg.name}
                </button>
              ))}
            </div>
          </div>
          <div style={cardB}>
            <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ ...thS, minWidth: 190, position: 'sticky', left: 0, zIndex: 2, borderRight: `1.5px solid ${C.border2}` }}>Component</th>
                    <th style={{ ...thS, textAlign: 'right' }}>Rate</th>
                    <th style={{ ...thS, textAlign: 'center' }}>S.T.</th>
                    <th style={{ ...thS, textAlign: 'center' }}>O.T.</th>
                    <th style={{ ...thS, textAlign: 'center' }}>D.T.</th>
                    {g.crafts.map((c) => (
                      <th key={c.id} style={{ ...thS, textAlign: 'right', minWidth: 110 }}>
                        <TextIn center value={c.name} placeholder="Craft"
                          onChange={(v) => patchCraft(gi, c.id, { name: v })} />
                        <div style={{ textAlign: 'center', marginTop: 2 }}>
                          <XBtn title={`Remove ${c.name || 'craft'}`} onClick={() => handleDeleteCraft(gi, c.id)} />
                        </div>
                      </th>
                    ))}
                    <th style={thS} />
                  </tr>
                </thead>
                <tbody>
                  {/* Wages */}
                  <SecRow span={6 + g.crafts.length} text="Straight time — full base wage" />
                  <tr style={{ background: '#f8fbf9' }}>
                    <td style={{ ...tdFrozen('#f8fbf9'), fontWeight: 750 }}>Base wage</td>
                    <td style={tdR}>—</td><td style={tdS} /><td style={tdS} /><td style={tdS} />
                    {g.crafts.map((c) => (
                      <td key={c.id} style={tdR}>
                        <NumIn value={c.wage} ariaLabel={`${c.name} wage`} onChange={(v) => patchCraft(gi, c.id, { wage: v })} />
                      </td>
                    ))}
                    <td style={tdS} />
                  </tr>
                  {/* Burden lines */}
                  {g.lines.map((l) => (
                    <tr key={l.id} style={{ opacity: l.appliesSt || l.appliesOt || l.appliesDt ? 1 : 0.45 }}>
                      <td style={tdFrozen()}>
                        <TextIn value={l.name} placeholder="Name this line" onChange={(v) => patchLine(gi, l.id, { name: v })} />
                      </td>
                      <td style={tdR}>
                        <NumIn value={l.pct} step="0.01" w={70} ariaLabel={`${l.name} percent`} onChange={(v) => patchLine(gi, l.id, { pct: v })} /> %
                      </td>
                      <td style={{ ...tdS, textAlign: 'center' }}><Check checked={l.appliesSt} ariaLabel="Straight time" onChange={(v) => patchLine(gi, l.id, { appliesSt: v })} /></td>
                      <td style={{ ...tdS, textAlign: 'center' }}><Check checked={l.appliesOt} ariaLabel="Overtime"      onChange={(v) => patchLine(gi, l.id, { appliesOt: v })} /></td>
                      <td style={{ ...tdS, textAlign: 'center' }}><Check checked={l.appliesDt} ariaLabel="Double time"   onChange={(v) => patchLine(gi, l.id, { appliesDt: v })} /></td>
                      {g.crafts.map((c) => (
                        <td key={c.id} style={{ ...tdR, color: C.muted }}>
                          {l.appliesSt ? money(c.wage * l.pct / 100) : '—'}
                        </td>
                      ))}
                      <td style={{ ...tdS, textAlign: 'right' }}><XBtn title={`Remove ${l.name || 'line'}`} onClick={() => handleDeleteLine(gi, l.id)} /></td>
                    </tr>
                  ))}
                  {/* ST totals */}
                  <SubRow label="S.T. burden" rate={pctS(burdenSum(g.lines, 'st'))} crafts={g.crafts} val={(c) => money(c.wage * burdenSum(g.lines, 'st') / 100)} />
                  <PctRow label="Overhead" value={g.ohSt}     onChange={(v) => patchGroup(gi, { ohSt: v })}     crafts={g.crafts} val={(c) => money(c.wage * g.ohSt / 100)} />
                  <PctRow label="Profit"   value={g.profitSt} onChange={(v) => patchGroup(gi, { profitSt: v })} crafts={g.crafts} val={(c) => money(c.wage * g.profitSt / 100)} />
                  <RateRow label="S.T. billing rate" bg={C.greenLo} rate={pctS(burdenSum(g.lines, 'st') + Number(g.ohSt) + Number(g.profitSt))} crafts={g.crafts} val={(c) => money(stRate(g, c.wage))} />
                  {/* OT */}
                  <SecRow span={6 + g.crafts.length} text="Overtime — adds a half portion with its own burden set" />
                  <SubRow label="O.T. portion" rate="50%" crafts={g.crafts} val={(c) => money(c.wage * 0.5)} />
                  <SubRow label="O.T. burden" rate={pctS(burdenSum(g.lines, 'ot'))} crafts={g.crafts} val={(c) => money(c.wage * 0.5 * burdenSum(g.lines, 'ot') / 100)} />
                  <PctRow label="Overhead on O.T." value={g.ohOt}     onChange={(v) => patchGroup(gi, { ohOt: v })}     crafts={g.crafts} val={(c) => money(c.wage * 0.5 * g.ohOt / 100)} />
                  <PctRow label="Profit on O.T."   value={g.profitOt} onChange={(v) => patchGroup(gi, { profitOt: v })} crafts={g.crafts} val={(c) => money(c.wage * 0.5 * g.profitOt / 100)} />
                  <RateRow label="O.T. billing rate" bg={C.accentLo} rate="S.T. + portion" crafts={g.crafts} val={(c) => money(otRate(g, c.wage))} />
                  {/* DT */}
                  <SecRow span={6 + g.crafts.length} text="Double time — adds a full portion" />
                  <PctRow label="Overhead on D.T." value={g.ohDt}     onChange={(v) => patchGroup(gi, { ohDt: v })}     crafts={g.crafts} val={(c) => money(c.wage * g.ohDt / 100)} />
                  <PctRow label="Profit on D.T."   value={g.profitDt} onChange={(v) => patchGroup(gi, { profitDt: v })} crafts={g.crafts} val={(c) => money(c.wage * g.profitDt / 100)} />
                  <RateRow label="D.T. billing rate" bg={C.errorLo} rate="S.T. + full portion" crafts={g.crafts} val={(c) => money(dtRate(g, c.wage))} />
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
              <Btn onClick={() => handleAddCraft(gi)}>+ Add craft</Btn>
              <Btn onClick={() => handleAddLine(gi)}>+ Add burden line</Btn>
              <span style={{ color: C.dim, fontSize: 13 }}>
                Every line is yours — rename it, reprice it, uncheck it, delete it, or add ones we never thought of.
              </span>
            </div>

            <Strip items={[
              ['S.T. burden', pctS(burdenSum(g.lines, 'st')), 'of base wage'],
              ['O.T. burden', pctS(burdenSum(g.lines, 'ot')), 'on the half portion'],
              ['D.T. burden', pctS(burdenSum(g.lines, 'dt')), 'on the full portion'],
              ['S.T. add-on', pctS(burdenSum(g.lines, 'st') + Number(g.ohSt) + Number(g.profitSt)), 'burden + O/H + profit'],
            ]} />
          </div>
        </div>
      )}

      {/* ═══ COMPOSITE ═══ */}
      {tab === 'comp' && (
        <div style={card}>
          <div style={cardH}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 750 }}>Manpower composite</h3>
              <div style={{ color: C.dim, fontSize: 13.5, marginTop: 2 }}>The crew you actually intend to run — one sellable rate per man-hour.</div>
            </div>
          </div>
          <div style={cardB}>
            {groups.map((gg, idx) => (
              <div key={gg.id} style={{ marginBottom: idx < groups.length - 1 ? 20 : 0 }}>
                <p style={lbl}>{gg.name}</p>
                <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                    <thead><tr>
                      <th style={thS}>Craft</th>
                      <th style={{ ...thS, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...thS, textAlign: 'right' }}>S.T. hrs</th>
                      <th style={{ ...thS, textAlign: 'right' }}>O.T. hrs</th>
                      <th style={{ ...thS, textAlign: 'right' }}>D.T. hrs</th>
                      <th style={{ ...thS, textAlign: 'right' }}>Total $</th>
                      <th style={{ ...thS, textAlign: 'right' }}>Hours</th>
                      <th style={{ ...thS, textAlign: 'right' }}>Avg rate</th>
                    </tr></thead>
                    <tbody>
                      {gg.crafts.map((c) => {
                        const tot = c.qty * (c.stHours * stRate(gg, c.wage) + c.otHours * otRate(gg, c.wage) + c.dtHours * dtRate(gg, c.wage));
                        const hrs = c.qty * (Number(c.stHours) + Number(c.otHours) + Number(c.dtHours));
                        return (
                          <tr key={c.id} style={{ opacity: c.qty ? 1 : 0.45 }}>
                            <td style={{ ...tdS, fontWeight: 650 }}>{c.name || '—'}</td>
                            <td style={tdR}><NumIn value={c.qty}     step="1" w={56} ariaLabel={`${c.name} quantity`} onChange={(v) => patchCraft(idx, c.id, { qty: v })} /></td>
                            <td style={tdR}><NumIn value={c.stHours} step="1" w={60} ariaLabel={`${c.name} ST hours`} onChange={(v) => patchCraft(idx, c.id, { stHours: v })} /></td>
                            <td style={tdR}><NumIn value={c.otHours} step="1" w={60} ariaLabel={`${c.name} OT hours`} onChange={(v) => patchCraft(idx, c.id, { otHours: v })} /></td>
                            <td style={tdR}><NumIn value={c.dtHours} step="1" w={60} ariaLabel={`${c.name} DT hours`} onChange={(v) => patchCraft(idx, c.id, { dtHours: v })} /></td>
                            <td style={{ ...tdR, fontWeight: 700 }}>{money(tot)}</td>
                            <td style={tdR}>{hrs}</td>
                            <td style={tdR}>{hrs ? money(tot / hrs) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <Strip items={[
              ...groups.map((gg, i) => [`${gg.name} composite`, money(comps[i].rate), `${comps[i].hours} hrs · ${money(comps[i].dollars)}`]),
              ['Project composite', money(proj.rate), `${proj.hours} hrs · ${money(proj.dollars)}`],
              ['With per diem', money(proj.rate + pdHr), 'per man-hour'],
            ]} />

            <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 16, marginTop: 16 }}>
              <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <p style={lbl}>Per diem</p>
                <PdRow label="Billed to client / day"   value={sheet.perDiemDaily}  onChange={(v) => patchSheet({ perDiemDaily: v })} />
                <PdRow label="Paid to employee / day"   value={sheet.perDiemPaid}   onChange={(v) => patchSheet({ perDiemPaid: v })} />
                <PdRow label="Weekly rate — jobs over 7 days" value={sheet.perDiemWeekly} onChange={(v) => patchSheet({ perDiemWeekly: v })} />
                <PdRow label="Hours per day" value={sheet.perDiemHoursPerDay} onChange={(v) => patchSheet({ perDiemHoursPerDay: v })} step="1" />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14.5 }}>
                  <span>Adds to composite</span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(pdHr)} / hr</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${C.text}`, marginTop: 7, paddingTop: 10, fontSize: 15.5, fontWeight: 800 }}>
                  <span>Your spread</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money((sheet.perDiemDaily || 0) - (sheet.perDiemPaid || 0))} / day</span>
                </div>
              </div>
              <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <p style={lbl}>Cost-plus markups</p>
                <PdRow label="Materials"      value={sheet.markupMaterials} onChange={(v) => patchSheet({ markupMaterials: v })} suffix="%" />
                <PdRow label="Subcontractors" value={sheet.markupSubs}      onChange={(v) => patchSheet({ markupSubs: v })} suffix="%" />
                <PdRow label="Rentals"        value={sheet.markupRentals}   onChange={(v) => patchSheet({ markupRentals: v })} suffix="%" />
                <PdRow label="Specialty items" value={sheet.markupSpecialty} onChange={(v) => patchSheet({ markupSpecialty: v })} suffix="%" />
                <p style={{ color: C.dim, fontSize: 13, margin: '10px 0 0' }}>
                  Per sheet, per category — one client at 10%, another at 6%, without touching the build-up.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CLIENT DOC ═══ */}
      {tab === 'doc' && (
        <div style={card}>
          <div style={cardH}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 750 }}>Rate sheet</h3>
              <div style={{ color: C.dim, fontSize: 13.5, marginTop: 2 }}>The client-facing document, generated from the build-up. Change a wage and this moves with it.</div>
            </div>
            <Btn variant="ghost" onClick={handleDeleteSheet} style={{ color: C.errorBold }}>Delete sheet</Btn>
          </div>
          <div style={cardB}>
            <div style={{ background: '#fff', border: `1px solid ${C.border2}`, borderRadius: 8, padding: isTablet ? '18px 16px' : '26px 30px' }}>
              <h4 style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 800 }}>Labor rates for time and material work on a reimbursable basis</h4>
              <div style={{ color: C.dim, fontSize: 13, marginBottom: 16 }}>
                {user?.company || 'Your company'} · <TextInline value={sheet.name} onChange={(v) => patchSheet({ name: v })} />
                {' · effective '}
                <input type="date" value={sheet.effectiveOn || ''} onChange={(e) => patchSheet({ effectiveOn: e.target.value })}
                  style={{ fontFamily: 'inherit', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, padding: '2px 6px' }} />
              </div>
              <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                  <thead><tr>
                    <th style={thS}>Craft</th>
                    <th style={{ ...thS, textAlign: 'right' }}>Straight time</th>
                    <th style={{ ...thS, textAlign: 'right' }}>Overtime</th>
                    <th style={{ ...thS, textAlign: 'right' }}>Double time</th>
                  </tr></thead>
                  <tbody>
                    {groups.map((gg) => gg.crafts.map((c) => (
                      <tr key={c.id}>
                        <td style={tdS}>
                          <div style={{ fontWeight: 650 }}>{c.name || '—'}</div>
                          {c.definition && <div style={{ color: C.dim, fontSize: 12.5 }}>{c.definition}</div>}
                        </td>
                        <td style={{ ...tdR, fontWeight: 700 }}>{money(stRate(gg, c.wage))}</td>
                        <td style={{ ...tdR, color: C.accent, fontWeight: 600 }}>{money(otRate(gg, c.wage))}</td>
                        <td style={{ ...tdR, color: C.errorBold, fontWeight: 600 }}>{money(dtRate(gg, c.wage))}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

              <p style={{ ...lbl, margin: '20px 0 8px' }}>Terms</p>
              {(sheet.perDiemDaily != null || sheet.perDiemWeekly != null) && (
                <p style={{ fontSize: 13.5, color: C.muted, margin: '0 0 6px' }}>
                  Per diem is <strong>{money(sheet.perDiemDaily || 0)}</strong> per day per employee onsite
                  {sheet.perDiemWeekly != null && <> — projects over 7 days at the weekly rate of <strong>{money(sheet.perDiemWeekly)}</strong></>}.
                </p>
              )}
              <p style={{ fontSize: 13.5, color: C.muted, margin: '0 0 6px' }}>
                Materials bill at cost plus <strong>{pctS(sheet.markupMaterials)}</strong>, subcontractors at cost plus <strong>{pctS(sheet.markupSubs)}</strong>, rentals at cost plus <strong>{pctS(sheet.markupRentals)}</strong>, specialty items at cost plus <strong>{pctS(sheet.markupSpecialty)}</strong>.
              </p>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: C.muted, lineHeight: 1.65 }}>
                {sheet.terms.map((t, i) => (
                  <li key={i} style={{ marginBottom: 5 }}>
                    {t}{' '}
                    <button onClick={() => patchSheet({ terms: sheet.terms.filter((_, j) => j !== i) })}
                      style={{ border: 'none', background: 'none', color: C.dim, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>remove</button>
                  </li>
                ))}
              </ol>
              <AddTerm onAdd={(t) => patchSheet({ terms: [...sheet.terms, t] })} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ EQUIPMENT ═══ */}
      {tab === 'equip' && (
        <div style={card}>
          <div style={cardH}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 750 }}>Equipment rental rate schedule</h3>
              <div style={{ color: C.dim, fontSize: 13.5, marginTop: 2 }}>Priced by the tiers each item actually carries. Blank stays blank — a dash on a quote is correct, an invented number is a dispute.</div>
            </div>
            <Btn onClick={handleAddEquip}>+ Add item</Btn>
          </div>
          <div style={cardB}>
            <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                <thead><tr>
                  <th style={{ ...thS, minWidth: 200 }}>Item</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Hour</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Day</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Week</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Month</th>
                  <th style={thS} />
                </tr></thead>
                <tbody>
                  {sheet.equipment.length === 0 && (
                    <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: C.dim, padding: 24 }}>
                      No equipment yet — add cranes, compressors, welding machines, anything you bill by the hour, day, week or month.
                    </td></tr>
                  )}
                  {sheet.equipment.map((e) => (
                    <tr key={e.id}>
                      <td style={tdS}>
                        <TextIn value={e.name} placeholder="Item name" onChange={(v) => patchEquip(e.id, { name: v })} />
                        <TextIn value={e.note || ''} bold={false} placeholder="note — e.g. operated · 8 hr minimum" onChange={(v) => patchEquip(e.id, { note: v })} />
                      </td>
                      {['hourly', 'daily', 'weekly', 'monthly'].map((k) => (
                        <td key={k} style={tdR}>
                          <input type="number" min="0" step="1" value={e[k] ?? ''} placeholder="—" aria-label={`${e.name} ${k}`}
                            onChange={(ev) => patchEquip(e.id, { [k]: ev.target.value === '' ? null : ev.target.value })}
                            style={{ fontFamily: 'inherit', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', textAlign: 'right', padding: '5px 7px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.surface, color: C.text, width: 84 }} />
                        </td>
                      ))}
                      <td style={{ ...tdS, textAlign: 'right' }}><XBtn title={`Remove ${e.name || 'item'}`} onClick={() => handleDeleteEquip(e.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row helper components (build-up table) ───────────────────────────────────

const SecRow = ({ span, text }) => (
  <tr><td colSpan={span} style={{ background: C.raised, fontSize: 11, fontWeight: 750, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, padding: '6px 9px', borderBottom: `1px solid ${C.border}` }}>{text}</td></tr>
);

const SubRow = ({ label, rate, crafts, val }) => (
  <tr style={{ background: '#f8fbf9' }}>
    <td style={{ ...tdFrozen('#f8fbf9'), fontWeight: 750 }}>{label}</td>
    <td style={tdR}>{rate}</td><td style={tdS} /><td style={tdS} /><td style={tdS} />
    {crafts.map((c) => <td key={c.id} style={{ ...tdR, fontWeight: 700 }}>{val(c)}</td>)}
    <td style={tdS} />
  </tr>
);

const PctRow = ({ label, value, onChange, crafts, val }) => (
  <tr>
    <td style={tdFrozen()}>{label}</td>
    <td style={tdR}><NumIn value={value} w={70} ariaLabel={label} onChange={onChange} /> %</td>
    <td style={tdS} /><td style={tdS} /><td style={tdS} />
    {crafts.map((c) => <td key={c.id} style={{ ...tdR, color: C.muted }}>{val(c)}</td>)}
    <td style={tdS} />
  </tr>
);

const RateRow = ({ label, bg, rate, crafts, val }) => (
  <tr style={{ background: bg }}>
    <td style={{ ...tdFrozen(bg), fontWeight: 800, fontSize: 14.5 }}>{label}</td>
    <td style={{ ...tdR, fontWeight: 700, fontSize: 12.5 }}>{rate}</td>
    <td style={tdS} /><td style={tdS} /><td style={tdS} />
    {crafts.map((c) => <td key={c.id} style={{ ...tdR, fontWeight: 800, fontSize: 14.5 }}>{val(c)}</td>)}
    <td style={tdS} />
  </tr>
);

const PdRow = ({ label, value, onChange, step = '2.5', suffix }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '5px 0', fontSize: 14.5 }}>
    <span>{label}</span>
    <span style={{ whiteSpace: 'nowrap' }}>
      {!suffix && '$'}<NumIn value={value ?? ''} step={step} w={84} ariaLabel={label} onChange={onChange} />{suffix}
    </span>
  </div>
);

const TextInline = ({ value, onChange }) => (
  <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
    style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 650, border: `1px solid ${C.border}`, borderRadius: 6, padding: '2px 6px', width: 220, color: C.text, background: C.surface }} />
);

function AddTerm({ onAdd }) {
  const [text, setText] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <input type="text" value={text} placeholder="Add a term…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); setText(''); } }}
        style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8 }} />
      <Btn onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}>Add</Btn>
    </div>
  );
}
