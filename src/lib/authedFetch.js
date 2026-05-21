// Thin wrapper over fetch() that automatically attaches the current
// Supabase session's access token as a Bearer header. Used for every
// call to /api/stripe/*, /api/marketing/*, /api/library/*, and
// /api/super-owner/* — the endpoints that now require requireAuth()
// to gate access.
//
// Why this exists: prior to the security audit, sensitive endpoints
// trusted req.body.userId without verifying the caller. We added a
// requireAuth() gate on the server side; this is the matching
// client-side pattern so every privileged request flows through one
// helper that can be audited at a glance.
//
// Usage mirrors fetch() exactly. Pass any standard fetch options;
// the Authorization header is merged in automatically.

import { supabase } from "../supabase";

export async function authedFetch(url, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) {
    // No active session — the caller is hitting a privileged endpoint
    // without being signed in. Surface this as an explicit error
    // rather than letting the server return 401 with an opaque message.
    throw new Error('Not signed in.');
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  return fetch(url, { ...options, headers });
}
