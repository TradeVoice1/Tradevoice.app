// POST /api/marketing/send-review-request
// Body: { ownerId, clientIds: string[], reviewLink?, customMessage? }
//
// Owner picks N clients in the UI and hits Send. We fan out an email per
// client, log each attempt to marketing_sends via the log_marketing_send
// RPC (which also bumps clients.review_requested_at on success), and
// return per-recipient results so the modal can show "5 sent, 1 failed".
//
// No batching/queue — at the scale a solo contractor operates (10-50
// clients) the round-trip is fine inside a single function invocation.
// If volumes grow past ~100 per click we'll move to a queued background
// job, but that's premature today.

import { getServiceClient } from "../_lib/supabase.js";
import { sendEmail, personalize, plainToHtml, appendUnsubscribeLine, unsubscribeUrlFor } from "../_lib/email.js";

function publicOrigin(req) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

const DEFAULT_MESSAGE = `Hi [FirstName],

Thanks so much for choosing [Company] — it was a pleasure working with you.

If you had a great experience, would you take 30 seconds to leave us a Google review? It really helps other homeowners find us and means a lot to a small business like ours.

[Review link below]

Either way, thanks again — and please reach out any time you need work done.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { ownerId, clientIds, reviewLink, customMessage } = req.body || {};
  if (!ownerId)                                 return res.status(400).json({ error: 'missing_owner_id' });
  if (!Array.isArray(clientIds) || !clientIds.length) {
    return res.status(400).json({ error: 'missing_client_ids' });
  }

  const supabase = getServiceClient();

  // Owner profile gives us the "from" friendly name + reply-to address.
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

  // Pull the clients in one shot — verifying ownership server-side (RLS
  // would also block cross-owner reads, but service-role bypasses RLS so
  // we explicitly filter on owner_id).
  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, name, email, unsubscribed_at, unsubscribe_token')
    .in('id', clientIds)
    .eq('owner_id', ownerId);
  if (clientsErr) {
    console.error('[review-request] client fetch failed', clientsErr);
    return res.status(500).json({ error: 'client_fetch_failed' });
  }

  const template = (customMessage && customMessage.trim()) || DEFAULT_MESSAGE;
  const subject  = `Quick favor? — ${companyName}`;
  const footer   = `Sent by ${companyName}. Reply to this email to reach us directly.`;
  const origin   = publicOrigin(req);

  const results = [];
  for (const client of (clients || [])) {
    if (!client.email) {
      results.push({ clientId: client.id, ok: false, error: 'no_email' });
      await supabase.rpc('log_marketing_send', {
        p_owner_id: ownerId,
        p_client_id: client.id,
        p_campaign_id: null,
        p_type: 'review_request',
        p_recipient_email: '(missing)',
        p_recipient_name: client.name || null,
        p_subject: subject,
        p_status: 'failed',
        p_resend_message_id: null,
        p_error_text: 'no_email_on_file',
      });
      continue;
    }

    // Honor opt-outs — log a 'skipped_unsubscribed' status for audit so the
    // contractor can see why a known client didn't receive the ask. The
    // log row still tells the activity feed something happened.
    if (client.unsubscribed_at) {
      results.push({ clientId: client.id, ok: false, error: 'unsubscribed' });
      await supabase.rpc('log_marketing_send', {
        p_owner_id: ownerId,
        p_client_id: client.id,
        p_campaign_id: null,
        p_type: 'review_request',
        p_recipient_email: client.email,
        p_recipient_name: client.name || null,
        p_subject: subject,
        p_status: 'unsubscribed',
        p_resend_message_id: null,
        p_error_text: 'recipient_unsubscribed',
      });
      continue;
    }

    const unsubscribeUrl = unsubscribeUrlFor(client.unsubscribe_token, origin);

    // Body has the contractor's review link appended automatically if the
    // template uses [ReviewLink] OR if no link token is in the template
    // and a reviewLink was supplied — keeps the default-template path
    // working without forcing every owner to write the token.
    let body = personalize(template, { clientName: client.name, companyName });
    const linkBlock = reviewLink ? `\n\n${reviewLink}` : '';
    if (body.includes('[ReviewLink]')) {
      body = body.replaceAll('[ReviewLink]', reviewLink || '');
    } else if (reviewLink && body.includes('[Review link below]')) {
      body = body.replaceAll('[Review link below]', reviewLink);
    } else if (reviewLink) {
      body = body + linkBlock;
    } else {
      // No review link configured yet — strip the placeholder so the email
      // doesn't read awkwardly. The contractor will add a link later.
      body = body.replaceAll('[Review link below]', '').replaceAll(/\n\s*\n\s*\n+/g, '\n\n');
    }

    const html      = plainToHtml(body, { footer, unsubscribeUrl });
    const finalText = appendUnsubscribeLine(body, unsubscribeUrl);
    const { ok, messageId, error } = await sendEmail({
      to: client.email,
      subject,
      text: finalText,
      html,
      fromName,
      replyTo,
      unsubscribeUrl,
      tags: ['review_request'],
    });

    await supabase.rpc('log_marketing_send', {
      p_owner_id: ownerId,
      p_client_id: client.id,
      p_campaign_id: null,
      p_type: 'review_request',
      p_recipient_email: client.email,
      p_recipient_name: client.name || null,
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
