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
  // Tech attribution — who performed the work. techName is a snapshot so
  // the invoice still shows the right name if the tech is later removed.
  techUserId:     r.tech_user_id   ?? null,
  techName:       r.tech_name      ?? '',
  // Source-quote link — set when the invoice was created via Quote→Invoice
  // conversion. Used by the un-invoice flow to revert the quote's status.
  // Replaces the old "parse it from notes" approach which broke if the user
  // edited the notes.
  sourceQuoteId:  r.source_quote_id ?? null,
  // Public-link share token (migration 0011). One unguessable UUID per
  // invoice; powers the /i/<token> public viewer.
  shareToken:     r.share_token    ?? null,
});

// Translate the front-end invoice shape into the DB column names. We do NOT include
// `id` here — the upsert helper sets it explicitly only when updating.
const invoiceToDb = (inv) => ({
  number:          inv.number,
  // client_id is a uuid foreign key — Postgres rejects empty string, so coerce
  // any falsy value (empty string, undefined, null) to null.
  client_id:       inv.clientId || null,
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
  tech_user_id:    inv.techUserId    || null,
  tech_name:       inv.techName      ?? null,
  source_quote_id: inv.sourceQuoteId || null,
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

// Public lookup by share_token — used by the customer-facing /i/<token> page.
// Goes through a security-definer RPC so RLS still locks SELECT for normal
// queries; only this function (and only via the unguessable token) returns
// the invoice + the contractor's branding/payment info.
export async function getPublicInvoice(shareToken) {
  if (!shareToken) return null;
  const { data, error } = await supabase.rpc('get_public_invoice', { p_token: shareToken });
  if (error) throw error;
  if (!data) return null;
  // The RPC returns { invoice: <db row>, profile: <subset> }. Convert the
  // invoice row into the front-end shape via the same dbToInvoice mapper so
  // the public page can reuse the same render code.
  return {
    invoice: dbToInvoice(data.invoice),
    profile: data.profile
      ? {
          name:        data.profile.name        || '',
          company:     data.profile.company     || '',
          phone:       data.profile.phone       || '',
          tagline:     data.profile.tagline     || '',
          license:     data.profile.license     || '',
          payments:    data.profile.payments    || {},
          accentColor: data.profile.accent_color || '',
          logoUrl:     data.profile.logo_url    || null,
        }
      : null,
  };
}
