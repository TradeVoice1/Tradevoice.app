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
  // Public sharable link token (migration 0014). Mirrors invoices.
  shareToken:     r.share_token      ?? null,
});

const quoteToDb = (q) => ({
  number:           q.number,
  // client_id is a uuid foreign key — Postgres rejects empty string, so coerce
  // any falsy value (empty string, undefined, null) to null. This was the bug
  // that made "Save + Preview" silently fail on a brand-new quote before a
  // client was picked.
  client_id:        q.clientId || null,
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

// ─────────────────────────────────────────────────────────────────────────────
// Public-link helpers — used by the customer-facing /q/<token> page.
// All three RPCs are security definer with anon grant, so no auth is needed.
// ─────────────────────────────────────────────────────────────────────────────

// Look up a quote by its share_token. Returns { quote, profile } or null.
export async function getPublicQuote(shareToken) {
  if (!shareToken) return null;
  const { data, error } = await supabase.rpc('get_public_quote', { p_token: shareToken });
  if (error) throw error;
  if (!data) return null;
  return {
    quote: dbToQuote(data.quote),
    profile: data.profile
      ? {
          name:        data.profile.name        || '',
          company:     data.profile.company     || '',
          phone:       data.profile.phone       || '',
          tagline:     data.profile.tagline     || '',
          license:     data.profile.license     || '',
          accentColor: data.profile.accent_color || '',
          logoUrl:     data.profile.logo_url    || null,
        }
      : null,
  };
}

// Customer taps "Accept Quote" on the public page → flips status to accepted.
// Idempotent on the DB side so a duplicate tap is harmless.
export async function acceptPublicQuote(shareToken) {
  const { data, error } = await supabase.rpc('accept_public_quote', { p_token: shareToken });
  if (error) throw error;
  return data;
}

// Fire-and-forget on first load of /q/<token> so the contractor sees that
// the customer opened the link. We don't surface errors — the page renders
// fine either way.
export async function markPublicQuoteViewed(shareToken) {
  try {
    await supabase.rpc('mark_public_quote_viewed', { p_token: shareToken });
  } catch (_) { /* swallow — non-fatal */ }
}
