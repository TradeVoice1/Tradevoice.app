// GET or POST /api/marketing/unsubscribe?t=<token>
//
// Public — token is the auth. Renders a tiny HTML confirmation page so the
// recipient sees feedback after clicking. Supports POST for RFC 8058
// "one-click unsubscribe" (Gmail / Apple Mail inbox button) — they fire a
// POST with body "List-Unsubscribe=One-Click" and want a 200 back, no
// further interaction needed.
//
// Idempotent: clicking twice flips nothing — unsubscribe_client_by_token
// uses coalesce(unsubscribed_at, now()).
//
// We respond 200 even when the token doesn't match a client, so a
// scraping bot can't enumerate valid vs invalid tokens. The HTML body
// reads the same in both cases ("you've been unsubscribed") — only the
// company name varies when known.

import { getServiceClient } from "../_lib/supabase.js";

export default async function handler(req, res) {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }

  const token = (req.query?.t || '').toString().trim();

  // Even with no token, return a friendly confirmation page so accidental
  // visits (e.g. bot crawls of the link) don't look like a server error.
  let companyDisplayName = '';
  let recognized = false;

  if (token) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase.rpc('unsubscribe_client_by_token', { p_token: token });
      if (!error && data) {
        recognized          = true;
        companyDisplayName  = data.company || '';
      }
    } catch (e) {
      console.error('[unsubscribe] rpc failed:', e);
      // Fall through — still render the generic confirmation.
    }
  }

  // For RFC 8058 one-click POST, mailbox providers just want a 200 — they
  // don't render any body. We still return the HTML in case a human
  // followed the link in a non-conforming client.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(renderPage({ companyDisplayName, recognized }));
}

function escape(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderPage({ companyDisplayName, recognized }) {
  const heading = recognized
    ? `You're unsubscribed${companyDisplayName ? ` from ${escape(companyDisplayName)}'s emails` : ''}.`
    : `You're unsubscribed.`;
  const sub = recognized
    ? `We won't email you again about reviews, follow-ups, or promotions.${companyDisplayName ? ` ${escape(companyDisplayName)} can still contact you about active service, but you won't see another marketing message from us.` : ''}`
    : `If you keep getting marketing emails, reply with "stop" and we'll handle it personally.`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Unsubscribed</title>
  <style>
    body { margin: 0; padding: 24px; background: #f7f7f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { max-width: 480px; width: 100%; background: #fff; border: 1px solid #e6ede9;
      border-radius: 12px; padding: 36px 32px; text-align: center;
      box-shadow: 0 1px 3px rgba(15,23,42,0.05); }
    .check { width: 56px; height: 56px; margin: 0 auto 20px;
      background: #eef7f2; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 28px; color: #2d6a4f; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.01em; }
    p { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 8px; }
    .brand { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e6ede9;
      font-size: 12px; color: #94a3b8; letter-spacing: 0.04em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>${heading}</h1>
    <p>${sub}</p>
    <div class="brand">Tradevoice</div>
  </div>
</body>
</html>`;
}
