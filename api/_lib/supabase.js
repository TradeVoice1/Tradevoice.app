// Server-side Supabase client used by Stripe API routes. Uses the service-role
// key so we can write to profiles + invoices on the user's behalf without
// going through RLS — these endpoints are protected at the HTTP layer (the
// OAuth callback verifies Stripe's state nonce, the webhook verifies the
// Stripe signature). The service-role key is NEVER exposed to the browser.

import { createClient } from "@supabase/supabase-js";

const url     = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.warn('[stripe] Missing SUPABASE_URL — set it in Vercel env vars.');
}
if (!service) {
  console.warn('[stripe] Missing SUPABASE_SERVICE_ROLE_KEY — set it in Vercel env vars.');
}

// Lazy-init so a missing env doesn't crash the function on import.
let _client = null;
export function getServiceClient() {
  if (!_client) {
    _client = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}
