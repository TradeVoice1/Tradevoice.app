// Native-shell detection — the App Store compliance switch.
//
// Tradevoice ships as a Capacitor shell around the live web app, so the SAME
// code runs in Safari and inside the iOS app. Apple's Guideline 3.1.1 requires
// in-app purchases for digital subscriptions, and reviewers routinely treat
// B2B SaaS as digital even when it manages real-world work. Showing our own
// card form inside the iOS app is the single most likely cause of a rejection.
//
// So the native build is LOGIN-ONLY — the QuickBooks / Slack / Notion model.
// Contractors buy a subscription on thetradevoice.com; the app signs them in.
// Everything else is untouched: quotes, invoices, scheduling, and CLIENT card
// payments all work normally. Client payments are a real-world service between
// the contractor and their customer — outside Apple's IAP scope entirely.
//
// Detection is deliberately defensive: Capacitor injects window.Capacitor, and
// we fall back to the custom scheme the WKWebView serves from. Anything we
// can't positively identify as native is treated as web, so a detection miss
// can never hide the purchase flow from a paying web customer.

export function isNativeApp() {
  if (typeof window === 'undefined') return false;
  try {
    const cap = window.Capacitor;
    if (cap) {
      if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
      if (cap.isNative === true) return true;
    }
    // Fallback: Capacitor's WKWebView serves the bundled shell over
    // capacitor:// (or ionic://) rather than https://.
    const proto = window.location?.protocol || '';
    if (proto === 'capacitor:' || proto === 'ionic:') return true;
  } catch { /* treat any failure as web — the safe direction */ }
  return false;
}

export function nativePlatform() {
  if (typeof window === 'undefined') return null;
  try { return window.Capacitor?.getPlatform?.() || null; } catch { return null; }
}

// Where we send someone who needs to start or change a paid subscription.
export const WEB_SIGNUP_URL = 'https://thetradevoice.com';
export const WEB_BILLING_URL = 'https://app.thetradevoice.com';
