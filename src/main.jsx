import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initIosInstallHint } from './pwa-install-hint.js'

// Note: React StrictMode disabled in dev because its double-invoke of effects
// orphans the supabase-js gotrue auth lock (a localStorage mutex), which makes
// sign-in hang for 5+ seconds on every refresh. Re-enable for a final QA pass
// before launch to surface any double-effect bugs.
createRoot(document.getElementById('root')).render(<App />)

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
