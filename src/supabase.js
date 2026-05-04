import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zslqxooswfpnkqyuulkr.supabase.co'
const supabaseKey = 'sb_publishable_M1jWKBLyl04-u3h7oYD4eA_r2QLqxdG'

export const supabase = createClient(supabaseUrl, supabaseKey)