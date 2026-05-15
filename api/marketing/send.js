// POST /api/marketing/send
//
// Consolidated marketing dispatch endpoint. Routes by `type`:
//
//   type='review_request'  → fan out a Google review ask to a picked list
//                            of clientIds. Optional reviewLink appended to
//                            the body; optional customMessage overrides
//                            the default template.
//   type='campaign'        → owner-composed one-shot blast. Creates a
//                            marketing_campaigns row, fans out to all
//                            non-unsubscribed clients (optionally filtered
//                            to those whose most-recent job matches a
//                            specific trade), logs each send.
//
// Why a single endpoint instead of two? Vercel Hobby caps serverless
// functions at 12 per deployment. We have 9 Stripe + 1 unsubscribe + 1
// library/parse-rate-table + this one = 12 exactly. Splitting marketing
// back into two files pushes us to 13 and the deploy ERRORs at upload
// time (the build itself succeeds). When the project upgrades to Vercel
// Pro the cap lifts; we can split back out then if it pays its way.
//
// Shared helpers live in ../_lib and don't count toward the function
// budget — only files directly under /api do.

import { getServiceClient } from "../_lib/supabase.js";
import { sendEmail, personalize, plainToHtml, appendUnsubscribeLine, unsubscribeUrlFor } from "../_lib/email.js";

const DEFAULT_REVIEW_MESSAGE = `Hi [FirstName],

Thanks so much for choosing [Company] — it was a pleasure working with you.

If you had a great experience, would you take 30 seconds to leave us a Google review? It really helps other homeowners find us and means a lot to a small business like ours.

[Review link below]

Either way, thanks again — and please reach out any time you need work done.`;

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

  const { type } = req.body || {};
  if (type === 'review_request') return handleReviewRequest(req, res);
  if (type === 'campaign')       return handleCampaign(req, res);
  return res.status(400).json({ error: 'unknown_type', detail: `type must be 'review_request' or 'campaign' (got ${JSON.stringify(type)})` });
}

// ─── REVIEW REQUEST ──────────────────────────────────────────────────────────
async function handleReviewRequest(req, res) {
  const { ownerId, clientIds, reviewLink, customMessage } = req.body || {};
  if (!ownerId) return res.status(400).json({ error: 'missing_owner_id' });
  if (!Array.isArray(clientIds) || !clientIds.length) {
    return res.status(400).json({ error: 'missing_client_ids' });
  }

  const supabase = getServiceClient();

  const { data: owner, error: ownerErr } = await supabase
    .from('profiles')
    .select('id, name, company, email')
    .eq('id', ownerId)
    .maybeSingle();
  if (ownerErr || !owner) return res.status(404).json({ error: 'owner_not_found' });

  const companyName = owner.company || owner.name || 'your contractor';
  const fromName    = companyName;
  const replyTo     = owner.email || undefined;

  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, name, email, unsubscribed_at, unsubscribe_token')
    .in('id', clientIds)
    .eq('owner_id', ownerId);
  if (clientsErr) {
    console.error('[send/review-request] client fetch failed', clientsErr);
    return res.status(500).json({ error: 'client_fetch_failed' });
  }

  const template = (customMessage && customMessage.trim()) || DEFAULT_REVIEW_MESSAGE;
  const subject  = `Quick favor? — ${companyName}`;
  const footer   = `Sent by ${companyName}. Reply to this email to reach us directly.`;
  const origin   = publicOrigin(req);

  const results = [];
  for (const client of (clients || [])) {
    if (!client.email) {
      results.push({ clientId: client.id, ok: false, error: 'no_email' });
      await supabase.rpc('log_marketing_send', {
        p_owner_id: ownerId, p_client_id: client.id, p_campaign_id: null,
        p_type: 'review_request',
        p_recipient_email: '(missing)', p_recipient_name: client.name || null,
        p_subject: subject, p_status: 'failed',
        p_resend_message_id: null, p_error_text: 'no_email_on_file',
      });
      continue;
    }
    if (client.unsubscribed_at) {
      results.push({ clientId: client.id, ok: false, error: 'unsubscribed' });
      await supabase.rpc('log_marketing_send', {
        p_owner_id: ownerId, p_client_id: client.id, p_campaign_id: null,
        p_type: 'review_request',
        p_recipient_email: client.email, p_recipient_name: client.name || null,
        p_subject: subject, p_status: 'unsubscribed',
        p_resend_message_id: null, p_error_text: 'recipient_unsubscribed',
      });
      continue;
    }

    const unsubscribeUrl = unsubscribeUrlFor(client.unsubscribe_token, origin);

    let body = personalize(template, { clientName: client.name, companyName });
    const linkBlock = reviewLink ? `\n\n${reviewLink}` : '';
    if (body.includes('[ReviewLink]')) {
      body = body.replaceAll('[ReviewLink]', reviewLink || '');
    } else if (reviewLink && body.includes('[Review link below]')) {
      body = body.replaceAll('[Review link below]', reviewLink);
    } else if (reviewLink) {
      body = body + linkBlock;
    } else {
      body = body.replaceAll('[Review link below]', '').replaceAll(/\n\s*\n\s*\n+/g, '\n\n');
    }

    const html      = plainToHtml(body, { footer, unsubscribeUrl });
    const finalText = appendUnsubscribeLine(body, unsubscribeUrl);
    const { ok, messageId, error } = await sendEmail({
      to: client.email,
      subject, text: finalText, html,
      fromName, replyTo, unsubscribeUrl,
      tags: ['review_request'],
    });

    await supabase.rpc('log_marketing_send', {
      p_owner_id: ownerId, p_client_id: client.id, p_campaign_id: null,
      p_type: 'review_request',
      p_recipient_email: client.email, p_recipient_name: client.name || null,
      p_subject: subject,
      p_status: ok ? 'sent' : 'failed',
      p_resend_message_id: messageId || null,
      p_error_text: ok ? null : (error || 'unknown_error'),
    });

    results.push({ clientId: client.id, ok, error: ok ? null : error });
  }

  const sentCount   = results.filter(r => r.ok).length;
  const failedCount = results.length - sentCount;
  return res.status(200).json({ ok: true, sentCount, failedCount, results });
}

// ─── CAMPAIGN ────────────────────────────────────────────────────────────────
async function handleCampaign(req, res) {
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
  if (ownerErr || !owner) return res.status(404).json({ error: 'owner_not_found' });

  const companyName = owner.company || owner.name || 'your contractor';
  const fromName    = companyName;
  const replyTo     = owner.email || undefined;

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
    console.error('[send/campaign] insert failed', campErr);
    return res.status(500).json({ error: 'campaign_insert_failed', detail: campErr.message });
  }

  const { data: allClients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, name, email, unsubscribed_at, unsubscribe_token')
    .eq('owner_id', ownerId)
    .is('unsubscribed_at', null);
  if (clientsErr) {
    await supabase.from('marketing_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
    return res.status(500).json({ error: 'client_fetch_failed' });
  }

  let recipients = (allClients || []).filter(c => c.email);

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
      text: finalText, html,
      fromName, replyTo, unsubscribeUrl,
      tags: ['campaign'],
    });
    await supabase.rpc('log_marketing_send', {
      p_owner_id: ownerId, p_client_id: c.id, p_campaign_id: campaign.id,
      p_type: 'campaign',
      p_recipient_email: c.email, p_recipient_name: c.name || null,
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
