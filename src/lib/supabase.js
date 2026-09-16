// Connection to the Supabase project (accounts, shared diaries, file storage).
//
// Both values come from Project Settings → API and belong in .env.local:
//   VITE_SUPABASE_URL=https://<project>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon public key>
//
// The anon key is meant to be public — every visitor's browser uses it. What protects the data is
// row-level security in supabase/migrations/0001_init.sql, which is enforced by the server.
// The service_role key must never appear in this app.
//
// With no keys configured the app stays exactly as it was: local-first, this browser only.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudEnabled = Boolean(url && anonKey)

// flowType 'implicit': the sign-in link carries its own tokens, so it works in whichever browser
// opens it — including the in-app browser inside Gmail. (PKCE would only work in the browser that
// asked for the link, which is exactly how people get stranded on a phone.)
export const supabase = cloudEnabled
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
    })
  : null
