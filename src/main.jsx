import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { initIosInstallHint } from './pwa-install-hint.js'

// ── Error monitoring (Sentry) ──
// Activates only when VITE_SENTRY_DSN is set in the Vercel env — without it
// this is a complete no-op, so dev and preview builds stay silent. Errors
// only (no performance tracing, no session replay, no PII): the goal is
// simply knowing when a contractor hits a crash without waiting for them to
// email support.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}

// Note: React StrictMode disabled in dev because its double-invoke of effects
// orphans the supabase-js gotrue auth lock (a localStorage mutex), which makes
// sign-in hang for 5+ seconds on every refresh. Re-enable for a final QA pass
// before launch to surface any double-effect bugs.
//
// Sentry.ErrorBoundary doubles as white-screen protection: a render crash
// shows a friendly reload card (and reports to Sentry when the DSN is set)
// instead of a dead blank page. Without a DSN it still renders the fallback —
// the capture call just no-ops.
createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary
    fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', sans-serif", background: '#f3f6f4' }}>
        <div style={{ background: '#fff', border: '1px solid #e6ede9', borderRadius: 12, padding: '32px 28px', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, marginBottom: 18 }}>
            Sorry about that — the error has been logged. Reload to pick up where you left off; your data is saved on the server.
          </div>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', borderRadius: 50, border: 'none', background: '#2d6a4f', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            Reload Tradevoice
          </button>
        </div>
      </div>
    }
  >
    <App />
  </Sentry.ErrorBoundary>
)

// ── PWA service worker (Phase 0) ──
// Registered in production only — keeping it out of dev avoids SW caching
// surprises while iterating. The SW (public/sw.js) caches the app shell so
// Tradevoice opens with no signal after one online visit; it never caches
// /api/ or auth traffic. Failure to register is non-fatal.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// ── iOS "Add to Home Screen" hint ──
// Self-gated: only shows on iOS Safari, not-yet-installed, not-dismissed.
// Safe to call everywhere; it no-ops off iOS (e.g. dev on Windows).
initIosInstallHint()
