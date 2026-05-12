// POST /api/marketing/send-campaign
// Body: { ownerId, name, tradeFilter, subject, message }
//
// Owner-initiated one-shot blast. Creates a marketing_campaigns row, fans
// out an email per matching client, logs each send, then flips the
// campaign status to 'sent' with the final sent_count.
//
// Trade filtering: clients don't currently have an explicit "trade"
// column — we derive it from their MOST RECENT job's trade. Clients with
// no jobs (or jobs whose trade doesn't match) are excluded. This mirrors
// what a contractor expects when they pick "HVAC clients only": the
// people they've actually serviced for HVAC work.
//
// "Send immediately" is the only schedule supported in Phase 1. Scheduled
// sends ('tomorrow morning', 'next Monday') need Vercel Cron — punt for
// now, but we still store the campaign as 'draft' if no immediate send.

import { getServiceClient } from "../_lib/supabase.js";
import { sendEmail, personalize, plainToHtml, appendUnsubscribeLine, unsubscribeUrlFor } from "../_lib/email.js";

function publicOrigin(req) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { ownerId, name, tradeFilter, subject, message } = req.body || {};
  if (!ownerId)         return res.status(400).json({ error: 'missing_owner_id' });
  if (!name?.trim())    return res.status(400).json({ error: 'missing_name' });
  if (!subject?.trim()) return res.status(400).json({ error: 'missing_subject' });
  if (!message?.trim()) return res.status(400).json({ error: 'missing_message' });

  const supabase = getServiceClient();

  const { data: owner, error: ownerErr } = await supabase
    .from('profiles')
    .select('id, name, company, email')
    .eq('id', ownerId)
    .maybeSingle();
  if (ownerErr || !owner) {
    return res.status(404).json({ error: 'owner_not_found' });
  }
  const companyName = owner.company || owner.name || 'your contractor';
  const fromName    = companyName;
  const replyTo     = owner.email || undefined;

  // Insert the campaign row up front so we have an id to attach to each
  // marketing_sends row (and so a partial failure still leaves a record).
  const { data: campaign, error: campErr } = await supabase
    .from('marketing_campaigns')
    .insert({
      owner_id:     ownerId,
      name:         name.trim(),
      trade_filter: tradeFilter || 'All',
      subject:      subject.trim(),
      message:      message.trim(),
      status:       'sending',
    })
    .select()
    .single();
  if (campErr) {
    console.error('[campaign] insert failed', campErr);
    return res.status(500).json({ error: 'campaign_insert_failed', detail: campErr.message });
  }

  // ── Resolve recipient list ────────────────────────────────────────────────
  // Filter out anyone who unsubscribed AT the query level so they don't even
  // count toward the trade-filter fan-out below. (Belt-and-suspenders with
  // the per-recipient skip in the loop — if they slip in somehow we still
  // log them as 'unsubscribed' instead of sending.)
  let clientQuery = supabase
    .from('clients')
    .select('id, name, email, unsubscribed_at, unsubscribe_token')
    .eq('owner_id', ownerId)
    .is('unsubscribed_at', null);
  const { data: allClients, error: clientsErr } = await clientQuery;
  if (clientsErr) {
    await supabase.from('marketing_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
    return res.status(500).json({ error: 'client_fetch_failed' });
  }

  let recipients = (allClients || []).filter(c => c.email);

  // Trade filter: look up each candidate's most-recent job's trade and
  // keep only those that match. "All" skips the filter entirely.
  if (tradeFilter && tradeFilter !== 'All' && recipients.length > 0) {
    const ids = recipients.map(c => c.id);
    const { data: jobs } = await supabase
      .from('jobs')
      .select('client_id, trade, date')
      .in('client_id', ids)
      .order('date', { ascending: false });
    const latestTradeByClient = new Map();
    for (const j of (jobs || [])) {
      if (!latestTradeByClient.has(j.client_id)) {
        latestTradeByClient.set(j.client_id, j.trade);
      }
    }
    recipients = recipients.filter(c => latestTradeByClient.get(c.id) === tradeFilter);
  }

  if (recipients.length === 0) {
    await supabase
      .from('marketing_campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0 })
      .eq('id', campaign.id);
    return res.status(200).json({
      ok: true, campaignId: campaign.id, sentCount: 0, failedCount: 0,
      detail: 'no_matching_clients',
    });
  }

  const footer  = `Sent by ${companyName}. Reply to this email to reach us directly.`;
  const origin  = publicOrigin(req);
  const results = [];

  for (const c of recipients) {
    const unsubscribeUrl = unsubscribeUrlFor(c.unsubscribe_token, origin);
    const body = personalize(message, { clientName: c.name, companyName });
    const html      = plainToHtml(body, { footer, unsubscribeUrl });
    const finalText = appendUnsubscribeLine(body, unsubscribeUrl);
    const { ok, messageId, error } = await sendEmail({
      to: c.email,
      subject: subject.trim(),
      text: finalText,
      html,
      fromName,
      replyTo,
      unsubscribeUrl,
      tags: ['campaign'],
    });
    await supabase.rpc('log_marketing_send', {
      p_owner_id: ownerId,
      p_client_id: c.id,
      p_campaign_id: campaign.id,
      p_type: 'campaign',
      p_recipient_email: c.email,
      p_recipient_name: c.name || null,
      p_subject: subject.trim(),
      p_status: ok ? 'sent' : 'failed',
      p_resend_message_id: messageId || null,
      p_error_text: ok ? null : (error || 'unknown_error'),
    });
    results.push({ clientId: c.id, ok });
  }

  const sentCount   = results.filter(r => r.ok).length;
  const failedCount = results.length - sentCount;

  await supabase
    .from('marketing_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: sentCount })
    .eq('id', campaign.id);

  return res.status(200).json({ ok: true, campaignId: campaign.id, sentCount, failedCount });
}
