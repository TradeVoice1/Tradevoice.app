// Social-handle URL builder.
//
// Contractors can paste a value into Settings → Social Media as either a
// full URL ("https://facebook.com/cornerstonemech"), a handle with the @
// prefix ("@cornerstonemech"), or just the bare username
// ("cornerstonemech"). This helper normalizes each to a real navigable
// URL + a short display label at render time so the invoice/quote
// footer always looks the same regardless of how the contractor entered
// it.
//
// Returns an ordered array of { platform, label, url, display, icon }
// objects, skipping any platform with an empty value. The render path
// just maps over the result — no further conditional checks needed.
//
// Both the in-app InvoiceDocument (App.jsx) and the public
// InvoicePaymentPage import from here so the rendering stays in sync.

const SOCIAL_PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  icon: 'ⓕ', host: 'facebook.com',  withAt: false },
  { key: 'instagram', label: 'Instagram', icon: '◉', host: 'instagram.com', withAt: false },
  { key: 'twitter',   label: 'X',         icon: '𝕏', host: 'x.com',         withAt: false },
  // TikTok requires the @ in the URL path itself (tiktok.com/@user, not
  // tiktok.com/user) so we flag it here and the builder adds it back.
  { key: 'tiktok',    label: 'TikTok',    icon: '♪', host: 'tiktok.com',    withAt: true  },
];

export function buildSocialLinks(handles) {
  if (!handles || typeof handles !== 'object') return [];
  const out = [];
  for (const cfg of SOCIAL_PLATFORMS) {
    const raw = String(handles[cfg.key] || '').trim();
    if (!raw) continue;
    let url;
    let display;
    if (/^https?:\/\//i.test(raw)) {
      // Full URL pasted — trust it as the navigable target, but trim a
      // protocol+www prefix from the display label so it reads cleanly.
      url = raw;
      const path = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
      display = path.length > 28 ? path.slice(0, 28) + '…' : path;
    } else {
      // Bare handle (with or without leading @). Strip @ for URL building,
      // then re-add for TikTok which requires the @ in the path itself.
      const bare = raw.replace(/^@/, '');
      const pathHandle = cfg.withAt ? `@${bare}` : bare;
      url = `https://${cfg.host}/${pathHandle}`;
      display = `@${bare}`;
    }
    out.push({ platform: cfg.key, label: cfg.label, icon: cfg.icon, url, display });
  }
  return out;
}

// Exposed for the Settings UI in case it needs to know which platforms we
// support (e.g. to render the row order or add a new platform). Front-end
// shouldn't need this directly today; included to keep the module self-
// describing.
export { SOCIAL_PLATFORMS };
