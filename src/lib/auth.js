// Signing in by email. Supabase sends a one-time link; no password to remember, and About You
// never handles one. Until the project keys are set, every call here is a no-op.

import { useEffect, useState } from 'react'
import { cloudEnabled, supabase } from './supabase.js'

export class AuthError extends Error {}

let cached = null // the last known session, so views can render immediately
const listeners = new Set()

if (cloudEnabled) {
  supabase.auth.getSession().then(({ data }) => {
    cached = data.session
    listeners.forEach((fn) => fn(cached))
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    cached = session
    listeners.forEach((fn) => fn(cached))
  })
}

/** The signed-in session, or null. Always null while the app runs local-only. */
export function useSession() {
  const [session, setSession] = useState(cached)
  useEffect(() => {
    if (!cloudEnabled) return
    const fn = (s) => setSession(s)
    listeners.add(fn)
    setSession(cached)
    return () => listeners.delete(fn)
  }, [])
  return session
}

export const currentUserId = () => cached?.user?.id ?? null

/** Emails a sign-in link back to this exact page. */
export async function sendSignInLink(email) {
  if (!cloudEnabled) throw new AuthError('About You isn’t connected to a server yet')
  const clean = email.trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new AuthError('That doesn’t look like an email address')
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
  })
  if (error) throw new AuthError(error.message)
}

export async function signOut() {
  if (cloudEnabled) await supabase.auth.signOut()
}
