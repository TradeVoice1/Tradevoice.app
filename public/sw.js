/* Tradevoice service worker — Phase 0 (PWA shell).
 *
 * Goal: the app *opens* with no signal after at least one online visit.
 * It caches the app shell (HTML + hashed JS/CSS/fonts/icons) and serves it
 * offline. It deliberately does NOT cache API/auth traffic — data offline is
 * Phase 1+ (IndexedDB). Every handler falls through to the network on error,
 * so a SW bug can never take the live site down.
 *
 * Bump CACHE_VERSION to force clients onto a fresh cache after a deploy.
 */
const CACHE_VERSION = 'tv-shell-v1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── install: precache the known shell, then take over immediately ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})            // a missing shell asset must not block install
      .then(() => self.skipWaiting())
  );
});

// ── activate: drop old caches, claim open tabs ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Allow the page to tell a waiting SW to activate now (used by the update flow).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isApi(url) {
  return url.pathname.startsWith('/api/');
}
function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

// ── fetch ──
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only ever handle GET. Never touch POST/PUT/etc. (payments, mutations).
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Never cache API / auth traffic — always live network.
  if (!isSameOrigin(url) || isApi(url)) return;

  // Navigation requests (page loads): network-first, fall back to the
  // cached shell so the SPA still boots offline. Keeps HTML fresh online
  // (so new deploys' hashed asset names are always current).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Same-origin static assets (hashed JS/CSS, fonts, images): stale-while-
  // revalidate — serve cache instantly if present, refresh in the background.
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);          // offline: use cache if we have it
        return cached || network;
      })
    )
  );
});
