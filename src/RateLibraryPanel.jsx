// Settings → Rate Library. Two surfaces:
//   1. The persistent list of an owner's labor / material / equipment items
//      (the database backing the quote editor's QuickAddPanel "library").
//   2. A drag-drop PDF / image uploader that pipes the file through Claude
//      to auto-populate the list from a rate sheet the contractor already
//      maintains in Word / Excel / paper.
//
// The "drop a file, AI fills it in" workflow is the headline feature, but
// the list view is what makes it useful long-term — without it, items
// imported today would only live until the next session.

import React, { useEffect, useMemo, useState } from "react";
import {
  listRateLibrary, addRateLibraryItem, updateRateLibraryItem,
  deleteRateLibraryItem, bulkAddRateLibraryItems, parseRateTable,
} from "./data/rateLibrary";

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
  greenBd:   '#a7d9be',
  accent:    '#ea580c',
  accentLo:  '#fff4ed',
  warn:      '#d97706',
  warnLo:    '#fef3c7',
  error:     '#dc2626',
  errorBold: '#b91c1c',
  errorLo:   '#fef2f2',
  success:   '#15803d',
};

const KIND_LABEL = { labor: 'Labor', material: 'Material', equipment: 'Equipment' };
const KIND_ORDER = ['labor', 'material', 'equipment'];

const fmtMoney = (n) => n == null ? '—'
  : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Upload + Preview Modal ───────────────────────────────────────────────────
// Shows the items Claude extracted with per-row checkboxes; lets the
// contractor uncheck noise before committing. The "Import" button
// inserts in one batch and then closes.
function ImportPreviewModal({ ownerId, parsed, onClose, onImported }) {
  const [items,   setItems]    = useState(() => parsed.items.map(i => ({ ...i, _picked: true })));
  const [saving,  setSaving]   = useState(false);
  const [error,   setError]    = useState('');

  const toggle = (idx) => setItems(p => p.map((it, i) => i === idx ? { ...it, _picked: !it._picked } : it));
  const setAll  = (val) => setItems(p => p.map(it => ({ ...it, _picked: val })));
  const updField = (idx, key, val) => setItems(p => p.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const pickedCount = items.filter(i => i._picked).length;

  const handleImport = async () => {
    if (saving || pickedCount === 0) return;
    setSaving(true);
    setError('');
    try {
      const toInsert = items
        .filter(i => i._picked)
        .map(({ _picked, ...rest }) => rest); // eslint-disable-line no-unused-vars
      const inserted = await bulkAddRateLibraryItems(ownerId, toInsert, {
        source:    'pdf_import',
        sourceRef: parsed.sourceRef || null,
      });
      if (onImported) onImported(inserted);
      onClose();
    } catch (e) {
      setError(e?.message || 'Could not import.');
    } finally {
      setSaving(false);
    }
  };

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal:   { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 880, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header:  { background: C.green, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1 },
    body:    { padding: '20px 24px' },
    footer:  { padding: '14px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff', alignItems: 'center' },
    btn: (primary, disabled) => ({
      padding: '11px 18px', borderRadius: 8, border: primary ? 'none' : `1px solid ${C.border}`,
      background: primary ? C.green : '#fff',
      color: primary ? '#fff' : C.muted,
      fontSize: 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      minHeight: 44,
    }),
    th: { padding: '8px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, textAlign: 'left', background: '#fafafa', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' },
    td: { padding: '6px', fontSize: 14, borderBottom: '1px solid #f3f3f3', verticalAlign: 'top' },
    input: { width: '100%', padding: '7px 8px', fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  };

  const renderRows = () => KIND_ORDER.map(kind => {
    const group = items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.kind === kind);
    if (group.length === 0) return null;
    return (
      <React.Fragment key={kind}>
        <tr>
          <td colSpan={6} style={{ padding: '12px 6px 4px', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, background: C.greenLo }}>
            {KIND_LABEL[kind]} — {group.length}
          </td>
        </tr>
        {group.map(({ it, idx }) => (
          <tr key={idx} style={{ background: it._picked ? '#fff' : '#fafafa' }}>
            <td style={{ ...s.td, width: 36, textAlign: 'center' }}>
              <input type="checkbox" checked={it._picked} onChange={() => toggle(idx)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
            </td>
            <td style={s.td}>
              <input value={it.description || ''} onChange={e => updField(idx, 'description', e.target.value)} style={s.input} />
            </td>
            <td style={{ ...s.td, width: 86 }}>
              <input value={it.unit || ''} onChange={e => updField(idx, 'unit', e.target.value)} style={s.input} placeholder={kind === 'labor' ? 'hr' : kind === 'equipment' ? 'day' : 'ea'} />
            </td>
            <td style={{ ...s.td, width: 100 }}>
              {kind === 'material' ? (
                <input type="number" min="0" step="0.01" value={it.cost ?? ''} onChange={e => updField(idx, 'cost', e.target.value)} style={s.input} placeholder="0.00" />
              ) : (
                <input type="number" min="0" step="0.01" value={it.rate ?? ''} onChange={e => updField(idx, 'rate', e.target.value)} style={s.input} placeholder="0.00" />
              )}
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  });

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Review extracted items</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              {parsed.counts.labor} labor · {parsed.counts.materials} material · {parsed.counts.equipment} equipment
              {parsed.tradeHint ? ` · trade hint: ${parsed.tradeHint}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={s.body}>
          {parsed.notes && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: C.warnLo, border: `1px solid ${C.warn}33`, borderRadius: 8, fontSize: 13, color: C.warn }}>
              <strong>Parser notes:</strong> {parsed.notes}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: C.muted }}>
              <strong>{pickedCount}</strong> of {items.length} selected. Uncheck anything that looks wrong; edit any field inline.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAll(true)}  style={{ background: 'none', border: 'none', color: C.green, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Select all</button>
              <button onClick={() => setAll(false)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Select none</button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>✓</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Unit</th>
                <th style={s.th}>Price</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: C.errorLo, border: `1px solid ${C.error}33`, borderRadius: 8, fontSize: 13, color: C.errorBold }}>
              {error}
            </div>
          )}
        </div>

        <div style={s.footer}>
          <button style={s.btn(false, saving)} onClick={onClose} disabled={saving}>Cancel</button>
          <div style={{ flex: 1 }} />
          <button style={s.btn(true, saving || pickedCount === 0)} onClick={handleImport} disabled={saving || pickedCount === 0}>
            {saving ? 'Importing…' : `Import ${pickedCount} item${pickedCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({ onFile, parsing, error }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = React.useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  };
  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !parsing && inputRef.current?.click()}
      style={{
        background: dragOver ? C.greenLo : '#fafbfa',
        border: `2px dashed ${dragOver ? C.green : C.border2}`,
        borderRadius: 10, padding: '28px 24px', textAlign: 'center',
        cursor: parsing ? 'wait' : 'pointer', transition: 'background 0.15s, border-color 0.15s',
        position: 'relative',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={onPick}
        disabled={parsing}
        style={{ display: 'none' }}
      />
      <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        {parsing ? 'Reading your rate sheet…' : 'Drop your rate sheet here'}
      </div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
        {parsing
          ? 'Claude is extracting labor, materials, and equipment. ~5-15 seconds.'
          : 'PDF, PNG, or JPEG (up to 8 MB). Or click to pick a file.'}
      </div>
      {error && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: C.errorLo, border: `1px solid ${C.error}33`, borderRadius: 8, fontSize: 13, color: C.errorBold, textAlign: 'left' }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function RateLibraryPanel({ user }) {
  const ownerId = user?.id;
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsed,  setParsed]  = useState(null);
  const [filter,  setFilter]  = useState('all'); // all | labor | material | equipment

  const refresh = async () => {
    if (!ownerId) { setLoading(false); return; }
    try {
      const rows = await listRateLibrary();
      setItems(rows);
    } catch (e) { console.error('rate library load', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [ownerId]);

  const grouped = useMemo(() => {
    const out = { labor: [], material: [], equipment: [] };
    for (const i of items) {
      if (filter !== 'all' && i.kind !== filter) continue;
      if (out[i.kind]) out[i.kind].push(i);
    }
    return out;
  }, [items, filter]);

  const handleFile = async (file) => {
    if (!ownerId) return;
    setParseError('');
    setParsing(true);
    try {
      const result = await parseRateTable({ ownerId, file });
      if (!result.items?.length) {
        setParseError("Couldn't extract any rates from that file. Try a clearer copy or pick a different file.");
        return;
      }
      setParsed(result);
    } catch (e) {
      setParseError(e?.message || 'Could not parse rate sheet.');
    } finally {
      setParsing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rate library item?')) return;
    try {
      await deleteRateLibraryItem(id);
      setItems(p => p.filter(i => i.id !== id));
    } catch (e) {
      alert(e?.message || 'Could not delete.');
    }
  };

  const counts = useMemo(() => ({
    all:       items.length,
    labor:     items.filter(i => i.kind === 'labor').length,
    material:  items.filter(i => i.kind === 'material').length,
    equipment: items.filter(i => i.kind === 'equipment').length,
  }), [items]);

  if (!ownerId) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
        Rate Library
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '18px 22px', marginBottom: 14 }}>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
          Drop a PDF or photo of your rate sheet — Tradevoice reads it with AI and drops every labor, material, and equipment item into the right place. These items show up in the quote / invoice editor's <strong>Quick Add</strong> menu so you can build line items with one click.
        </div>

        <DropZone onFile={handleFile} parsing={parsing} error={parseError} />
      </div>

      {/* Library list */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {counts.all} item{counts.all === 1 ? '' : 's'} in your library
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all',       label: 'All',       n: counts.all },
              { id: 'labor',     label: 'Labor',     n: counts.labor },
              { id: 'material',  label: 'Material',  n: counts.material },
              { id: 'equipment', label: 'Equipment', n: counts.equipment },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '7px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: filter === f.id ? C.green : '#fff',
                color:      filter === f.id ? '#fff'    : C.muted,
                border: filter === f.id ? 'none' : `1px solid ${C.border}`,
                cursor: 'pointer',
              }}>
                {f.label} <span style={{ opacity: 0.7, fontWeight: 700, marginLeft: 4 }}>({f.n})</span>
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: C.dim, fontSize: 14 }}>Loading library…</div>
        )}
        {!loading && counts.all === 0 && (
          <div style={{ padding: '36px 24px', textAlign: 'center', color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Your library is empty. Drop a rate sheet above to populate it — or add items one at a time from the Quick Add menu in the quote / invoice editor.
          </div>
        )}
        {!loading && counts.all > 0 && (
          <div>
            {KIND_ORDER.filter(k => grouped[k].length > 0).map(kind => (
              <div key={kind}>
                <div style={{ padding: '10px 18px 6px', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, background: C.greenLo }}>
                  {KIND_LABEL[kind]}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 18px', textAlign: 'left',  fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, borderBottom: `1px solid ${C.border}` }}>Description</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left',  fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, borderBottom: `1px solid ${C.border}`, width: 100 }}>Unit</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, borderBottom: `1px solid ${C.border}`, width: 110 }}>{kind === 'material' ? 'Cost' : 'Rate'}</th>
                      <th style={{ padding: '8px 18px', textAlign: 'right', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, borderBottom: `1px solid ${C.border}`, width: 90 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[kind].map(it => (
                      <tr key={it.id}>
                        <td style={{ padding: '10px 18px', fontSize: 14, color: C.text, borderBottom: '1px solid #f6f6f6' }}>
                          {it.description}
                          {it.source === 'pdf_import' && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: C.dim, fontStyle: 'italic' }}>
                              from {it.sourceRef || 'rate sheet'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 14, color: C.muted, borderBottom: '1px solid #f6f6f6' }}>{it.unit || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 14, color: C.text, fontWeight: 600, textAlign: 'right', borderBottom: '1px solid #f6f6f6', fontVariantNumeric: 'tabular-nums' }}>
                          {kind === 'material' ? fmtMoney(it.cost) : fmtMoney(it.rate)}
                        </td>
                        <td style={{ padding: '10px 18px', textAlign: 'right', borderBottom: '1px solid #f6f6f6' }}>
                          <button onClick={() => handleDelete(it.id)} style={{
                            background: 'transparent', border: `1px solid ${C.error}33`, color: C.error,
                            fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                          }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {parsed && (
        <ImportPreviewModal
          ownerId={ownerId}
          parsed={parsed}
          onClose={() => setParsed(null)}
          onImported={(newRows) => { setItems(prev => [...newRows, ...prev]); }}
        />
      )}
    </div>
  );
}
