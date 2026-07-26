// Unsaved-work protection for the quote / invoice editors.
//
// The field reality this solves: a contractor builds a quote on a tailgate,
// then the browser reloads, the tab gets closed, or Cancel is tapped by
// mistake — and ten minutes of line items are gone with no warning.
//
// Two layers:
//   1. beforeunload — the browser's native "Leave site?" prompt on refresh /
//      tab-close / back-navigation, armed only while there are real changes.
//   2. An IndexedDB-free localStorage snapshot, throttled, so even a hard
//      crash (or iOS killing a backgrounded tab) leaves a recoverable draft.
//
// Everything is guarded: if localStorage is unavailable (private mode, quota)
// the hook silently degrades to just the beforeunload prompt.

import { useEffect, useRef, useState } from 'react';

const KEY_PREFIX = 'tv_draft_';
const SAVE_THROTTLE_MS = 1500;

const keyFor = (kind, ownerId, id) => `${KEY_PREFIX}${kind}_${ownerId || 'anon'}_${id || 'new'}`;

// Read a previously stashed draft, if any. Returns null when absent/unusable.
export function readDraft(kind, ownerId, id) {
  try {
    const raw = localStorage.getItem(keyFor(kind, ownerId, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return parsed; // { data, savedAt }
  } catch { return null; }
}

export function clearDraft(kind, ownerId, id) {
  try { localStorage.removeItem(keyFor(kind, ownerId, id)); } catch { /* non-fatal */ }
}

/**
 * @param {object}  opts
 * @param {string}  opts.kind     'quote' | 'invoice'
 * @param {string}  opts.ownerId  scopes the key so two accounts on one device never mix
 * @param {string}  opts.id       the record id ('new' for unsaved)
 * @param {object}  opts.data     the current editor payload (serializable)
 * @param {boolean} opts.dirty    true when the user has actually changed something
 * @param {boolean} opts.enabled  false to disarm entirely (e.g. after a successful save)
 */
export function useDraftGuard({ kind, ownerId, id, data, dirty, enabled = true }) {
  const lastWrite = useRef(0);
  const timer     = useRef(null);
  const [savedAt, setSavedAt] = useState(null);

  // Native leave-prompt — only armed while dirty, so a read-only visit never nags.
  useEffect(() => {
    if (!enabled || !dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';       // required for Chrome to show its prompt
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled, dirty]);

  // Throttled local snapshot so a crash still leaves something to recover.
  useEffect(() => {
    if (!enabled || !dirty) return undefined;
    const write = () => {
      try {
        const stamp = Date.now();
        localStorage.setItem(keyFor(kind, ownerId, id), JSON.stringify({ data, savedAt: stamp }));
        lastWrite.current = stamp;
        setSavedAt(stamp);
      } catch { /* quota or private mode — beforeunload still covers us */ }
    };
    const since = Date.now() - lastWrite.current;
    if (since >= SAVE_THROTTLE_MS) { write(); return undefined; }
    timer.current = setTimeout(write, SAVE_THROTTLE_MS - since);
    return () => clearTimeout(timer.current);
  }, [enabled, dirty, kind, ownerId, id, data]);

  return {
    savedAt,
    clear: () => { clearDraft(kind, ownerId, id); setSavedAt(null); },
  };
}
