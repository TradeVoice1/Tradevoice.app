// Hang-safe promise wrapper. Three different save paths (quote save,
// client save, sign-in) have now wedged the UI on "Saving…" / "Signing in…"
// because a Supabase fetch never resolved or rejected. The root cause is
// systemic — most likely a PostgREST schema-cache reload, a stalled
// gotrue token refresh, or a transient edge throttle — and patching each
// form individually is whack-a-mole. This helper makes the pattern
// reusable.
//
// Usage:
//   import { withTimeout } from './lib/withTimeout';
//   const result = await withTimeout(supabase.from('x').insert(...), {
//     label: 'addClient',
//     timeoutMs: 30000,
//   });
//
// On timeout:
//   - The returned promise rejects with an Error whose .message includes
//     the label and the friendly "check your network / share the console"
//     guidance.
//   - The underlying promise keeps running in the background (we can't
//     cancel a fetch we didn't create with an AbortController). The
//     caller should NOT use its eventual result — treat the timeout as
//     authoritative.
//   - We log to console with the label so post-mortem screenshots
//     consistently identify which call wedged.

export const DEFAULT_TIMEOUT_MS = 30000;

export async function withTimeout(promise, opts = {}) {
  const { label = 'request', timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const t0 = performance.now();
  let timedOut = false;
  console.log(`[${label}] start`);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      timedOut = true;
      const sec = (timeoutMs / 1000).toFixed(0);
      reject(new Error(
        `${label} timed out after ${sec} seconds. Check your network and try again — ` +
        `if this keeps happening, screenshot the browser console (F12 → Console) so we can diagnose.`
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    const ms = (performance.now() - t0).toFixed(0);
    console.log(`[${label}] success (${ms}ms)`);
    return result;
  } catch (e) {
    const ms = (performance.now() - t0).toFixed(0);
    console.error(`[${label}] failed (${ms}ms)`, e, { timedOut });
    throw e;
  }
}
