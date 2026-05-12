// Shared Resend client + send helpers for marketing endpoints.
//
// Sending model (Phase 1):
//   - All emails leave from a single Tradevoice-owned domain
//     (MARKETING_FROM_EMAIL, default "marketing@thetradevoice.com"). Per-
//     contractor sending domains are a Phase 2 feature once enough demand
//     justifies the DNS overhead.
//   - The From "friendly name" is the contractor's company (or their full
//     name as fallback) so the inbox preview reads like it's from THEM.
//   - reply_to is set to the contractor's own email so when the customer
//     hits reply, it bounces back to the contractor's inbox, not ours.
//
// To enable in prod:
//   1. Verify thetradevoice.com in the Resend dashboard (Domains → Add Domain)
//   2. Add the DKIM + SPF records Resend gives you to GoDaddy DNS for
//      thetradevoice.com — usually 3 records (DKIM x2 + SPF/TXT)
//   3. Set RESEND_API_KEY in Vercel env vars (Production + Preview + Dev)
//   4. Optionally set MARKETING_FROM_EMAIL if you want a different default
//      from-address (e.g. hello@thetradevoice.com)

import { Resend } from "resend";

const API_KEY = process.env.RESEND_API_KEY;
if (!API_KEY) {
  console.warn('[email] Missing RESEND_API_KEY — set it in Vercel env vars.');
}

let _client = null;
function getClient() {
  if (!_client) _client = new Resend(API_KEY || 're_placeholder');
  return _client;
}

export const MARKETING_FROM_EMAIL =
  process.env.MARKETING_FROM_EMAIL || 'marketing@thetradevoice.com';

// Personalize a template by substituting [Name], [Company], [FirstName].
// Kept dumb on purpose — no Mustache/Handlebars dependency for four tokens.
export function personalize(template, { clientName, companyName }) {
  if (!template) return '';
  const firstName = (clientName || '').trim().split(/\s+/)[0] || '';
  return template
    .replaceAll('[Name]',      clientName  || 'there')
    .replaceAll('[FirstName]', firstName    || 'there')
    .replaceAll('[Company]',   companyName || 'your contractor');
}

// Wrap a plain-text message in a minimal HTML shell so the customer's inbox
// doesn't display it as a wall of unformatted text. We use linebreak →
// paragraph conversion to keep the contractor's writing readable.
//
// unsubscribeUrl: when present, the footer gets an "Unsubscribe" link
// alongside the contractor's reply-to nudge. CAN-SPAM and standard
// deliverability hygiene want this on any non-transactional send.
export function plainToHtml(text, { footer, unsubscribeUrl } = {}) {
  if (!text) return '';
  // Crude HTML escape — sufficient for contractor-authored bodies where
  // angle brackets would be a typo, not intentional markup.
  const escape = (s) => s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">${escape(p).replaceAll('\n', '<br>')}</p>`)
    .join('');
  const footerHtml = (footer || unsubscribeUrl) ? `
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <div style="font-size:12px;color:#888;line-height:1.6">
      ${footer ? escape(footer) : ''}
      ${unsubscribeUrl ? `${footer ? ' &middot; ' : ''}<a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline">Unsubscribe</a>` : ''}
    </div>` : '';
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px 28px;border-radius:8px;border:1px solid #e8e8e8;">
    ${paragraphs}
    ${footerHtml}
  </div>
</body></html>`;
}

// Append an unsubscribe sentence to a plain-text body so MUAs that fall back
// to text/plain still surface the opt-out (Gmail's "View Original" + screen
// readers, etc.). Idempotent — bail if the body already mentions unsubscribe.
export function appendUnsubscribeLine(text, unsubscribeUrl) {
  if (!text || !unsubscribeUrl) return text;
  if (/unsubscribe/i.test(text)) return text;
  return text + `\n\n--\nNot interested in these emails? Unsubscribe: ${unsubscribeUrl}`;
}

// Send one email via Resend. Returns { ok, messageId? , error? }. Never
// throws — callers in marketing flows want per-recipient outcomes so the
// batch can keep going even when a few addresses bounce.
//
// unsubscribeUrl: when supplied, we attach both the visible footer link
// (via plainToHtml) AND the RFC 8058 / RFC 2369 List-Unsubscribe and
// List-Unsubscribe-Post headers so Gmail / Apple Mail render their
// native "Unsubscribe" button next to the From address.
export async function sendEmail({
  to, subject, text, html,
  fromName, replyTo, tags = [],
  unsubscribeUrl,
}) {
  if (!to)      return { ok: false, error: 'missing_to' };
  if (!subject) return { ok: false, error: 'missing_subject' };
  if (!text && !html) return { ok: false, error: 'missing_body' };
  if (!API_KEY)       return { ok: false, error: 'resend_not_configured' };

  // Friendly "From: Tiny's Plumbing <marketing@thetradevoice.com>" format —
  // mailers render the friendly name as the inbox-preview "from".
  const friendly = (fromName || '').replace(/[<>"]/g, '').trim();
  const from = friendly
    ? `${friendly} <${MARKETING_FROM_EMAIL}>`
    : MARKETING_FROM_EMAIL;

  const headers = {};
  if (unsubscribeUrl) {
    // RFC 2369: List-Unsubscribe with an https URL (mailto: also valid but
    // we don't run an inbound mail server).
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    // RFC 8058: signals to mailbox providers that the URL accepts a POST
    // with body "List-Unsubscribe=One-Click" — Gmail / Apple Mail use this
    // for their one-tap inbox button. Our /api/marketing/unsubscribe
    // endpoint handles both GET and POST.
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  try {
    const { data, error } = await getClient().emails.send({
      from,
      to,
      reply_to: replyTo || undefined,
      subject,
      text: text || undefined,
      html: html || undefined,
      headers: Object.keys(headers).length ? headers : undefined,
      tags: tags.length ? tags.map(t => ({ name: 'tradevoice', value: t })) : undefined,
    });
    if (error) {
      return { ok: false, error: error.message || JSON.stringify(error) };
    }
    return { ok: true, messageId: data?.id || null };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Build the public unsubscribe URL for a client token. Used by both the
// per-recipient List-Unsubscribe header and the footer link in the body.
export function unsubscribeUrlFor(token, origin) {
  if (!token) return null;
  const base = (origin || process.env.PUBLIC_APP_URL || 'https://app.thetradevoice.com').replace(/\/$/, '');
  return `${base}/api/marketing/unsubscribe?t=${encodeURIComponent(token)}`;
}
