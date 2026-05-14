// Rate library — persistent storage for a contractor's labor, material,
// and equipment items. Backs the Settings → Rate Library panel (PDF
// import + manual edit) and the quote/invoice editor's QuickAddPanel.
//
// All access is owner-scoped via RLS on rate_library_items (migration
// 0025). The browser can write directly — Supabase enforces that
// owner_id must equal auth.uid() on every insert / update / delete.

import { supabase } from "../supabase";

const dbToItem = (r) => ({
  id:          r.id,
  kind:        r.kind,
  trade:       r.trade ?? null,
  description: r.description ?? '',
  unit:        r.unit ?? '',
  qty:         r.qty  != null ? Number(r.qty)  : null,
  cost:        r.cost != null ? Number(r.cost) : null,
  rate:        r.rate != null ? Number(r.rate) : null,
  source:      r.source ?? 'manual',
  sourceRef:   r.source_ref ?? null,
  createdAt:   r.created_at ?? null,
});

const itemToDb = (i, ownerId, defaults = {}) => ({
  owner_id:    ownerId,
  kind:        i.kind,
  trade:       i.trade || null,
  description: (i.description || '').trim(),
  unit:        i.unit || null,
  qty:         i.qty  != null && i.qty  !== '' ? Number(i.qty)  : null,
  cost:        i.cost != null && i.cost !== '' ? Number(i.cost) : null,
  rate:        i.rate != null && i.rate !== '' ? Number(i.rate) : null,
  source:      i.source     || defaults.source     || 'manual',
  source_ref:  i.sourceRef  || defaults.sourceRef  || null,
});

export async function listRateLibrary() {
  const { data, error } = await supabase
    .from('rate_library_items')
    .select('*')
    .order('kind',        { ascending: true })
    .order('description', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToItem);
}

// Insert one item (used by the existing QuickAddPanel "Save to Library").
export async function addRateLibraryItem(ownerId, item) {
  const row = itemToDb(item, ownerId);
  if (!row.description) throw new Error('Description required.');
  if (!['labor','material','equipment'].includes(row.kind)) {
    throw new Error('Unknown kind: ' + row.kind);
  }
  const { data, error } = await supabase
    .from('rate_library_items')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return dbToItem(data);
}

export async function updateRateLibraryItem(id, patch) {
  // Drop fields the caller didn't include so we don't null them by accident.
  const allowed = ['kind','trade','description','unit','qty','cost','rate','source','sourceRef'];
  const body = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) body[k] = patch[k];
  }
  const dbRow = {};
  if ('kind'        in body) dbRow.kind        = body.kind;
  if ('trade'       in body) dbRow.trade       = body.trade || null;
  if ('description' in body) dbRow.description = (body.description || '').trim();
  if ('unit'        in body) dbRow.unit        = body.unit || null;
  if ('qty'         in body) dbRow.qty         = body.qty  != null && body.qty  !== '' ? Number(body.qty)  : null;
  if ('cost'        in body) dbRow.cost        = body.cost != null && body.cost !== '' ? Number(body.cost) : null;
  if ('rate'        in body) dbRow.rate        = body.rate != null && body.rate !== '' ? Number(body.rate) : null;
  if ('source'      in body) dbRow.source      = body.source;
  if ('sourceRef'   in body) dbRow.source_ref  = body.sourceRef;

  const { data, error } = await supabase
    .from('rate_library_items')
    .update(dbRow)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return dbToItem(data);
}

export async function deleteRateLibraryItem(id) {
  const { error } = await supabase.from('rate_library_items').delete().eq('id', id);
  if (error) throw error;
}

// Bulk insert from the PDF parse flow. RLS still applies — we set owner_id
// on every row. If any insert fails (e.g. constraint violation), the whole
// batch rejects, but the caller's preview-and-confirm UX should have
// already filtered obvious garbage.
export async function bulkAddRateLibraryItems(ownerId, items, { source = 'pdf_import', sourceRef = null } = {}) {
  const rows = (items || [])
    .filter(i => i && i.description && i.description.trim() && ['labor','material','equipment'].includes(i.kind))
    .map(i => itemToDb(i, ownerId, { source, sourceRef }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from('rate_library_items')
    .insert(rows)
    .select();
  if (error) throw error;
  return (data ?? []).map(dbToItem);
}

// ── Front-end → API wrapper ──────────────────────────────────────────────────
// Sends the PDF/image to the Claude-backed parser endpoint and returns the
// structured items. Pure transport; the actual save is the bulkAdd call
// above after the user confirms.
export async function parseRateTable({ ownerId, file }) {
  if (!ownerId) throw new Error('Sign in first.');
  if (!file)    throw new Error('No file selected.');
  // Convert File → base64 in the browser. FileReader is the path that
  // works on every browser (no Blob.arrayBuffer needed for IE/older).
  const fileBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      // result is a data URL like "data:application/pdf;base64,XXXX" — strip the prefix.
      const result = String(reader.result || '');
      const comma  = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

  const resp = await fetch('/api/library/parse-rate-table', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      ownerId,
      fileBase64,
      fileName:  file.name,
      mediaType: file.type,
    }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.detail || body.error || 'Could not parse rate sheet.');
    err.code = body.error;
    throw err;
  }
  return body; // { ok, items, tradeHint, notes, sourceRef, counts }
}
