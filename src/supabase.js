import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zslqxooswfpnkqyuulkr.supabase.co'
const supabaseKey = 'sb_publishable_M1jWKBLyl04-u3h7oYD4eA_r2QLqxdG'

// gotrue-js wraps every auth/REST call in a navigator-locks mutex so that
// multiple browser tabs don't race to refresh the same access token.
// In our case the lock causes more harm than good: parallel data fetches on
// mount queue up behind it and any orphaned lock (StrictMode unmount,
// dev-server HMR) hangs the entire app for 5+ seconds. Replace it with a
// no-op for now — single-tab races are not a real risk.
const noOpLock = async (_name, _acquireTimeout, fn) => fn();

// Network safety net. Abort any Supabase request that gets NO response within
// REQUEST_TIMEOUT_MS instead of letting the UI hang. The backend is fast and
// healthy; the failure mode we actually see in the field is a dead network
// PATH to *.supabase.co — office / job-site Wi-Fi that silently drops the
// connection, a captive portal, a VPN with a stale tunnel, or a content
// blocker. Without this, signInWithPassword (and every read) stays "pending"
// forever and the button wedges on "Signing in…". With it, the request is
// truly cancelled and the caller gets a fast, clear, retryable error.
// Any AbortSignal supabase-js passes for its own internal timeouts is honored.
const REQUEST_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS  = 45000;   // Storage moves real file bytes — needs more headroom than an API/auth call.
const fetchWithTimeout = (input, init = {}) => {
  const controller = new AbortController();
  // File uploads/downloads (Supabase Storage) legitimately take longer than an
  // API call, especially on weak job-site connections — give them more time so
  // a valid 2 MB logo isn't killed mid-upload by the 20s default.
  const reqUrl = typeof input === 'string' ? input : (input?.url || input?.href || String(input || ''));
  const timeoutMs = reqUrl.includes('/storage/v1/') ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => {
    const msg = "We couldn't reach the server. Check your internet connection and try again — " +
                "if you're on office or job-site Wi-Fi, try cellular data, as some networks block our servers.";
    try { controller.abort(new DOMException(msg, 'TimeoutError')); }
    catch { controller.abort(); }
  }, timeoutMs);

  const upstream = init.signal;
  const onUpstreamAbort = () => controller.abort(upstream.reason);
  if (upstream) {
    if (upstream.aborted) controller.abort(upstream.reason);
    else upstream.addEventListener('abort', onUpstreamAbort, { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => {
      clearTimeout(timer);
      if (upstream) upstream.removeEventListener('abort', onUpstreamAbort);
    });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: noOpLock,
  },
  global: {
    fetch: fetchWithTimeout,
  },
})