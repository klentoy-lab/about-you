// Lockbin session for the local preview.
// The passcode is stored only as a salted PBKDF2 hash. The open/closed state lives in memory,
// so a reload always starts locked. It re-locks after ten minutes without activity or as soon
// as the tab loses focus. On the real backend this is unlock_lockbin() in the migration —
// there, locked content never reaches the browser at all.

import { useSyncExternalStore } from 'react'
import { getSettings, saveSettings } from './store.js'

const IDLE_MS = 10 * 60 * 1000

let unlocked = false
let timer = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)))

async function hash(passcode, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: 210000 },
    key,
    256,
  )
  return toHex(bits)
}

export const hasPasscode = () => Boolean(getSettings().lockbin)

export async function setPasscode(passcode) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  saveSettings({ lockbin: { salt, hash: await hash(passcode, salt) } })
  open()
}

export async function unlock(passcode) {
  const lb = getSettings().lockbin
  if (!lb) return false
  const ok = (await hash(passcode, lb.salt)) === lb.hash
  if (ok) open()
  return ok
}

function open() {
  unlocked = true
  touch()
  emit()
}

export function lock() {
  if (!unlocked) return
  unlocked = false
  clearTimeout(timer)
  emit()
}

/** Any activity while open slides the ten-minute window. */
export function touch() {
  if (!unlocked) return
  clearTimeout(timer)
  timer = setTimeout(lock, IDLE_MS)
}

if (typeof window !== 'undefined') {
  window.addEventListener('blur', lock)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && lock())
  for (const ev of ['pointerdown', 'keydown', 'scroll']) window.addEventListener(ev, touch, { passive: true })
}

export const isUnlocked = () => unlocked

export function useLockbin() {
  return useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), isUnlocked)
}
