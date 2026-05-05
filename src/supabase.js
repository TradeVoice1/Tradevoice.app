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

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: noOpLock,
  },
})