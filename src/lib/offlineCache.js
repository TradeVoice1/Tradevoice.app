// Offline read cache (PWA Phase 1).
//
// A tiny IndexedDB-backed cache so reference data the quote builder needs
// (clients, rate library) is available with no signal. The cachedRead()
// wrapper is NETWORK-FIRST and transparent when online: it still does the
// normal Supabase fetch, just also stores the result. When offline (or the
// fetch fails), it returns the last-cached copy instead of throwing.
//
// Keys are namespaced by the signed-in user id (read from the local session,
// which works offline) so two accounts on the same device never mix data.
//
// Everything is guarded: if IndexedDB is unavailable, cachedRead degrades to
// a plain fetch with no caching — i.e. exactly today's behavior. It can never
// break the online path.

import { supabase } from "../supabase";

const DB_NAME = 'tv-offline';
const STORE = 'cache';
const DB_VERSION = 1;
let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

async function idbGet(key) {
  try {
    const db = await openDb();
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  } catch { return undefined; }
}

async function idbSet(key, val) {
  try {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      const r = tx.objectStore(STORE).put(val, key);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  } catch { /* non-fatal — caching is best-effort */ }
}

// Local session read — no network, works offline.
async function currentUid() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || 'anon';
  } catch { return 'anon'; }
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// Network-first read with offline fallback.
//   online  → fetch fresh, refresh the cache, return fresh
//   offline → return the last-cached copy (if any)
//   error   → fall back to cache; rethrow only if there's nothing cached
export async function cachedRead(namespace, fetcher) {
  const uid = await currentUid();
  const key = `${uid}:${namespace}`;

  if (isOffline()) {
    const c = await idbGet(key);
    if (c) return c.data;
    // No cache and we think we're offline — still try the network in case
    // navigator.onLine is wrong; if it genuinely fails, the catch handles it.
  }

  try {
    const data = await fetcher();
    await idbSet(key, { data, cachedAt: Date.now() });
    return data;
  } catch (e) {
    const c = await idbGet(key);
    if (c) return c.data;
    throw e;
  }
}

// When was this namespace last refreshed from the network? (epoch ms or null)
export async function getCachedAt(namespace) {
  const uid = await currentUid();
  const c = await idbGet(`${uid}:${namespace}`);
  return c?.cachedAt || null;
}
