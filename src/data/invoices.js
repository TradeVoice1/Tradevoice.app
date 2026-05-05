// Invoices data layer. RLS in Supabase already restricts reads/writes to the signed-in user.

import { supabase } from "../supabase";

const dbToInvoice = (r) => ({
  id:             r.id,
  number:         r.number,
  clientId:       r.client_id      ?? null,
  clientName:     r.client_name    ?? '',
  clientEmail:    r.client_email   ?? '',
  clientPhone:    r.client_phone   ?? '',
  clientAddress:  r.client_address ?? '',
  title:          r.title          ?? '',
  trade:          r.trade          ?? '',
  status:         r.status         ?? 'draft',
  terms:          r.terms          ?? 'Net 30',
  createdAt:      r.created_at_date ?? '',
  dueAt:          r.due_at         ?? '',
  paidAt:         r.paid_at        ?? null,
  labor:          r.labor          ?? [],
  materials:      r.materials      ?? [],
  equipment:      r.equipment      ?? [],
  markup:         r.markup         != null ? Number(r.markup) : 0,
  tax:            r.tax            != null ? Number(r.tax)    : 0,
  notes:          r.notes          ?? '',
  payments:       r.payments       ?? [],
  activity:       r.activity       ?? [],
});

// Translate the front-end invoice shape into the DB column names. We do NOT include
// `id` here — the upsert helper sets it explicitly only when updating.
const invoiceToDb = (inv) => ({
  number:          inv.number,
  client_id:       inv.clientId      ?? null,
  client_name:     inv.clientName    ?? null,
  client_email:    inv.clientEmail   ?? null,
  client_phone:    inv.clientPhone   ?? null,
  client_address:  inv.clientAddress ?? null,
  title:           inv.title         ?? null,
  trade:           inv.trade         ?? null,
  status:          inv.status        ?? 'draft',
  terms:           inv.terms         ?? null,
  created_at_date: inv.createdAt     || null,
  due_at:          inv.dueAt         || null,
  paid_at:         inv.paidAt        || null,
  labor:           inv.labor         ?? [],
  materials:       inv.materials     ?? [],
  equipment:       inv.equipment     ?? [],
  markup:          inv.markup        ?? 0,
  tax:             inv.tax           ?? 0,
  notes:           inv.notes         ?? null,
  payments:        inv.payments      ?? [],
  activity:        inv.activity      ?? [],
});

export async function listInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToInvoice);
}

// Insert if id is missing-or-not-found, otherwise update. We avoid Postgres `upsert`
// because client-generated UUIDs aren't always desirable; instead we insert when
// there's no existing row and update otherwise. The caller passes a synthetic id
// for new rows (uid()) — we let Postgres assign a real uuid.
export async function upsertInvoice(ownerId, inv) {
  // Detect "is this an existing row in DB?" by trying to update first.
  const dbRow = invoiceToDb(inv);

  // If id looks like a uuid (contains a dash + matches uuid pattern), try update.
  const looksLikeUuid = typeof inv.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inv.id);

  if (looksLikeUuid) {
    const { data, error } = await supabase
      .from('invoices')
      .update(dbRow)
      .eq('id', inv.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return dbToInvoice(data);
    // fall through to insert if no row matched
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (error) throw error;
  return dbToInvoice(data);
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}
