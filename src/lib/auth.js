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

/**
 * Emails a sign-in code (and a link).
 *
 * The code matters: mail apps open links in their own in-app browser, which doesn't hold the
 * check this browser stored when asking — so a tapped link can land signed out. A typed code
 * signs in whichever browser you're actually using.
 */
export async function sendSignInCode(email) {
  if (!cloudEnabled) throw new AuthError('About You isn’t connected to a server yet')
  const clean = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new AuthError('That doesn’t look like an email address')
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
  })
  if (error) throw new AuthError(error.message.includes('rate limit') ? 'Too many emails for now — try again in a few minutes' : error.message)
  return clean
}

/** Finishes sign-in with the six-digit code from that email. */
export async function verifySignInCode(email, code) {
  if (!cloudEnabled) throw new AuthError('About You isn’t connected to a server yet')
  const token = code.replace(/\D/g, '')
  if (token.length < 6) throw new AuthError('The code is six digits')
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' })
  if (error) throw new AuthError(error.message.includes('expired') ? 'That code has expired — send a new one' : 'That code didn’t work')
}

export async function signOut() {
  if (cloudEnabled) await supabase.auth.signOut()
}
