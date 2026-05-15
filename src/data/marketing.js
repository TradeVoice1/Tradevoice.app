// Marketing data layer — campaigns, send log, and the front-end wrappers
// around the /api/marketing/* endpoints.

import { supabase } from "../supabase";

const dbToCampaign = (r) => ({
  id:           r.id,
  name:         r.name        ?? '',
  tradeFilter:  r.trade_filter ?? 'All',
  subject:      r.subject     ?? '',
  message:      r.message     ?? '',
  status:       r.status      ?? 'draft',
  scheduledFor: r.scheduled_for ?? null,
  sentAt:       r.sent_at     ?? null,
  sentCount:    r.sent_count    ?? 0,
  openedCount:  r.opened_count  ?? 0,
  clickedCount: r.clicked_count ?? 0,
  createdAt:    r.created_at  ?? null,
});

const dbToSend = (r) => ({
  id:               r.id,
  clientId:         r.client_id     ?? null,
  campaignId:       r.campaign_id   ?? null,
  type:             r.type,
  recipientEmail:   r.recipient_email,
  recipientName:    r.recipient_name ?? '',
  subject:          r.subject       ?? '',
  status:           r.status,
  resendMessageId:  r.resend_message_id ?? null,
  errorText:        r.error_text    ?? null,
  sentAt:           r.sent_at       ?? null,
  createdAt:        r.created_at,
});

export async function listCampaigns() {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToCampaign);
}

// Recent sends feed for the Marketing → Overview "Recent Activity" panel.
// Default 25 most recent because the panel only shows ~5 — extra rows
// give the user "Load more" headroom without re-querying.
export async function listRecentSends(limit = 25) {
  const { data, error } = await supabase
    .from('marketing_sends')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(dbToSend);
}

// ── API wrappers ──────────────────────────────────────────────────────────

// Both flows hit the same /api/marketing/send endpoint with a `type`
// discriminator. We consolidated two endpoints into one to stay under
// Vercel Hobby's 12-function cap; the server-side dispatcher in send.js
// keeps the implementations separate. Behavior unchanged.
export async function sendReviewRequests({ ownerId, clientIds, reviewLink, customMessage }) {
  const resp = await fetch('/api/marketing/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type: 'review_request', ownerId, clientIds, reviewLink, customMessage }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.detail || body.error || 'Could not send review requests.');
    err.code = body.error;
    throw err;
  }
  return body; // { ok, sentCount, failedCount, results }
}

export async function sendCampaign({ ownerId, name, tradeFilter, subject, message }) {
  const resp = await fetch('/api/marketing/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type: 'campaign', ownerId, name, tradeFilter, subject, message }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.detail || body.error || 'Could not send campaign.');
    err.code = body.error;
    throw err;
  }
  return body; // { ok, campaignId, sentCount, failedCount }
}

// Owner manually marks a client as "reviewed" (since we don't yet poll
// Google Places API). Toggles reviewed_at between now and null.
export async function setClientReviewed(clientId, reviewed) {
  const patch = { reviewed_at: reviewed ? new Date().toISOString() : null };
  const { data, error } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', clientId)
    .select('id, reviewed_at, review_requested_at')
    .single();
  if (error) throw error;
  return data;
}
