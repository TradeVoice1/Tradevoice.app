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
  // ── Tracking + job-detail fields (migration 0023) ──────────────────────
  poNumber:           r.po_number             ?? '',
  workOrderNumber:    r.work_order_number     ?? '',
  // Denormalized job number snapshot (migration 0029). Stamped by
  // handleJobToInvoice when an invoice is created from a Schedule job;
  // empty string for invoices created directly (not from a job).
  jobNumber:          r.job_number            ?? '',
  jobAddress:         r.job_address           ?? '',
  requestedBy:        r.requested_by          ?? '',
  approvedBy:         r.approved_by           ?? '',
  salespersonUserId:  r.salesperson_user_id   ?? null,
  salespersonName:    r.salesperson_name      ?? '',
  sentAt:             r.sent_at               ?? null,
  viewedAt:           r.viewed_at             ?? null,
  servicePeriodStart: r.service_period_start  ?? '',
  servicePeriodEnd:   r.service_period_end    ?? '',
  // ── Ship 2 — invoice maturity fields (migration 0024) ─────────────────
  permitNumber:       r.permit_number         ?? '',
  discountAmount:     r.discount_amount != null ? Number(r.discount_amount) : 0,
  discountLabel:      r.discount_label        ?? '',
  lateFeeTerms:       r.late_fee_terms        ?? '',
  techSignedName:     r.tech_signed_name      ?? '',
  techSignedAt:       r.tech_signed_at        ?? null,
  customerSignedName: r.customer_signed_name  ?? '',
  customerSignedAt:   r.customer_signed_at    ?? null,
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
  // ── Tracking + job-detail fields (migration 0023). Empty strings coerce
  // to null so Postgres doesn't store unhelpful '' values for dates etc.
  po_number:            inv.poNumber           || null,
  work_order_number:    inv.workOrderNumber    || null,
  job_number:           inv.jobNumber          || null,
  job_address:          inv.jobAddress         || null,
  requested_by:         inv.requestedBy        || null,
  approved_by:          inv.approvedBy         || null,
  salesperson_user_id:  inv.salespersonUserId  || null,
  salesperson_name:     inv.salespersonName    || null,
  sent_at:              inv.sentAt             || null,
  viewed_at:            inv.viewedAt           || null,
  service_period_start: inv.servicePeriodStart || null,
  service_period_end:   inv.servicePeriodEnd   || null,
  // Ship 2 (migration 0024) — note we DO NOT round-trip customer_signed_*
  // fields here. Those are written exclusively via the sign_public_invoice
  // RPC from the anonymous public invoice page. The owner editor reads
  // them but never writes — keeps the signature audit trail honest.
  permit_number:        inv.permitNumber       || null,
  discount_amount:      inv.discountAmount != null && inv.discountAmount !== '' ? Number(inv.discountAmount) : 0,
  discount_label:       inv.discountLabel      || null,
  late_fee_terms:       inv.lateFeeTerms       || null,
  tech_signed_name:     inv.techSignedName     || null,
  tech_signed_at:       inv.techSignedAt       || null,
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

// Public e-signature — called by the customer-facing /i/<token> page when
// the customer types their name + acknowledges receipt. Anon-callable via
// the sign_public_invoice RPC (migration 0024). Returns the server-stamped
// timestamp so the UI can switch into a "signed" success state.
export async function signPublicInvoice(shareToken, signerName) {
  if (!shareToken) throw new Error('Missing share token.');
  if (!signerName || !signerName.trim()) throw new Error('Type your name to sign.');
  const { data, error } = await supabase.rpc('sign_public_invoice', {
    p_token: shareToken,
    p_name:  signerName.trim(),
    p_ip:    null,   // browser can't reliably know its own public IP — server logs the source already
  });
  if (error) throw error;
  if (!data?.ok) {
    const err = new Error(data?.error || 'Could not record signature.');
    err.code = data?.error;
    throw err;
  }
  return data; // { ok, signed_at, name }
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
          // Stripe Connect readiness — true only when the contractor has
          // finished OAuth AND Stripe has verified their account can accept
          // charges. Drives whether the public page shows "Pay with Card"
          // vs the existing handle-based payment instructions.
          stripeAccountId:      data.profile.stripe_account_id || null,
          stripeChargesEnabled: !!data.profile.stripe_account_charges_enabled,
          // Ship 2 — COI + late fee policy (migration 0024). Used by the
          // public InvoicePaymentPage to render the same insurance/terms
          // footer the in-app InvoiceDocument shows.
          coiCarrier:           data.profile.coi_carrier         || '',
          coiPolicyNumber:      data.profile.coi_policy_number   || '',
          coiExpiresAt:         data.profile.coi_expires_at      || '',
          defaultLateFeePolicy: data.profile.default_late_fee_policy || '',
          // Social handles (migration 0027). The contractor's chosen
          // Facebook/X/Instagram/TikTok identifiers, rendered as a
          // "Follow us" row on the public invoice. Empty {} when the
          // contractor hasn't configured any platform.
          socialHandles:        data.profile.social_handles      || {},
        }
      : null,
  };
}
