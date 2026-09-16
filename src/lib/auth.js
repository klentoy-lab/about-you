// Signing in by email. Supabase sends a one-time link; no password to remember, and About You
// never handles one. Until the project keys are set, every call here is a no-op.

import { useEffect, useState } from 'react'
import { cloudEnabled, supabase } from './supabase.js'

export class AuthError extends Error {}

/**
 * A sign-in link that failed says so in the address (expired, already used…).
 * Read it once at startup, before anything tidies the URL away.
 */
export const linkError = (() => {
  if (typeof window === 'undefined') return null
  const from = (s) => new URLSearchParams(s.replace(/^[#?]/, ''))
  const params = [from(window.location.hash), from(window.location.search)]
  for (const p of params) {
    const description = p.get('error_description')
    if (description) return decodeURIComponent(description).replace(/\+/g, ' ')
  }
  return null
})()

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
  if (error) {
    const m = error.message.toLowerCase()
    if (m.includes('rate limit')) throw new AuthError('Too many emails for now — try again in a few minutes')
    // Supabase's wording when its mail server (SMTP) turns the message away.
    if (m.includes('error sending')) throw new AuthError('The sign-in email couldn’t be sent right now. Please try again in a little while.')
    throw new AuthError(error.message)
  }
  return clean
}

/**
 * Google refuses sign-in inside the built-in browsers of Facebook, Messenger, Instagram, TikTok
 * and similar apps. Spot them so the button can explain instead of failing on Google's page.
 */
export const inAppBrowser = (() => {
  if (typeof navigator === 'undefined') return false
  return /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|musical_ly|Snapchat|; wv\)/i.test(navigator.userAgent)
})()

/** Is Google switched on in the Supabase project? (Asked first, so nobody lands on a raw error page.) */
async function googleEnabled() {
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
    const settings = await res.json()
    return Boolean(settings?.external?.google)
  } catch {
    return true // can't tell — let Google's page speak for itself
  }
}

/** Sends the person to Google, which returns them here signed in. */
export async function signInWithGoogle() {
  if (!cloudEnabled) throw new AuthError('About You isn’t connected to a server yet')
  if (!(await googleEnabled())) throw new AuthError('Google sign-in isn’t available yet — please use email for now.')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${window.location.pathname}`, queryParams: { prompt: 'select_account' } },
  })
  if (error) {
    throw new AuthError(
      /provider is not enabled|unsupported provider/i.test(error.message)
        ? 'Google sign-in isn’t switched on yet'
        : error.message,
    )
  }
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
