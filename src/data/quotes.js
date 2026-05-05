// Quotes data layer.

import { supabase } from "../supabase";

const dbToQuote = (r) => ({
  id:             r.id,
  number:         r.number,
  clientId:       r.client_id        ?? null,
  title:          r.title            ?? '',
  trade:          r.trade            ?? '',
  status:         r.status           ?? 'draft',
  scope:          r.scope            ?? '',
  fieldNotes:     r.field_notes      ?? '',
  labor:          r.labor            ?? [],
  materials:      r.materials        ?? [],
  equipment:      r.equipment        ?? [],
  markup:         r.markup           != null ? Number(r.markup) : 0,
  tax:            r.tax              != null ? Number(r.tax)    : 0,
  terms:          r.terms            ?? '',
  createdAt:      r.created_at_date  ?? '',
  sentAt:         r.sent_at_date     ?? null,
  expiresAt:      r.expires_at       ?? '',
  revisionOf:     r.revision_of      ?? null,
  revisionNumber: r.revision_number  ?? 1,
});

const quoteToDb = (q) => ({
  number:           q.number,
  client_id:        q.clientId       ?? null,
  title:            q.title          ?? null,
  trade:            q.trade          ?? null,
  status:           q.status         ?? 'draft',
  scope:            q.scope          ?? null,
  field_notes:      q.fieldNotes     ?? null,
  labor:            q.labor          ?? [],
  materials:        q.materials      ?? [],
  equipment:        q.equipment      ?? [],
  markup:           q.markup         ?? 0,
  tax:              q.tax            ?? 0,
  terms:            q.terms          ?? null,
  created_at_date:  q.createdAt      || null,
  sent_at_date:     q.sentAt         || null,
  expires_at:       q.expiresAt      || null,
  revision_of:      q.revisionOf     ?? null,
  revision_number:  q.revisionNumber ?? 1,
});

export async function listQuotes() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToQuote);
}

export async function upsertQuote(ownerId, q) {
  const dbRow = quoteToDb(q);
  const looksLikeUuid = typeof q.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.id);

  if (looksLikeUuid) {
    const { data, error } = await supabase
      .from('quotes')
      .update(dbRow)
      .eq('id', q.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return dbToQuote(data);
  }

  const { data, error } = await supabase
    .from('quotes')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (error) throw error;
  return dbToQuote(data);
}

export async function deleteQuote(id) {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
}
