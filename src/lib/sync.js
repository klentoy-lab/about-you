// Keeps this browser and the server in step while signed in.
//
// Reading:  sign in → pull the profile and every entry, then work from the local copy
//           (so the app stays instant and still works offline).
// Writing:  any local change is pushed in the background, one entry at a time.
//
// Sealed entries are left alone: while the Lockbin is locked the server sends no content for them,
// so the local copy is kept as-is and nothing is pushed back over it.

import { useSyncExternalStore } from 'react'
import { cloudEnabled, supabase } from './supabase.js'
import { deleteEntry, pullMyEntries, pullProfile, pushEntry, pushProfile } from './cloud.js'
import { getSettings, listEntries, replaceEntries, saveSettings, subscribe } from './store.js'

let userId = null
let unsubscribe = null
let pushing = Promise.resolve()
let snapshot = new Map() // entry id → JSON of what the server has
let settingsSnapshot = ''
let pulling = false

const state = { phase: 'off', error: null, at: null, pending: 0 }
const listeners = new Set()
const set = (patch) => {
  Object.assign(state, patch)
  listeners.forEach((fn) => fn())
}

export const syncState = () => state
export const useSync = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), syncState)

const entryKey = (e) => JSON.stringify(e)
const settingsKey = (s) => JSON.stringify([s.ownerName, s.dedication, s.handle, s.defaultVisibility])

/** Signed in: pull everything, then keep pushing changes as they happen. */
export async function startSync(session) {
  if (!cloudEnabled || !session) return
  userId = session.user.id
  set({ phase: 'syncing', error: null })

  try {
    pulling = true
    const [profile, remoteEntries] = await Promise.all([pullProfile(userId), pullMyEntries()])

    const local = listEntries()
    const localById = new Map(local.map((e) => [e.id, e]))
    // A sealed entry sends no content while locked — keep what this browser already has.
    const merged = remoteEntries.map((e) => (e.inLockbin && !e.moments.length && localById.get(e.id) ? localById.get(e.id) : e))

    const current = getSettings()
    // Was anything in this browser written while signed into a different account?
    const belongsToSomeoneElse = Boolean(current.syncedUserId) && current.syncedUserId !== userId
    const nothingOnServer = merged.length === 0 && !profile.ownerName && !profile.handle
    const localHasSomething = local.length > 0 || Boolean(current.ownerName)

    if (nothingOnServer && localHasSomething && !belongsToSomeoneElse) {
      // First sign-in with a diary already written here: keep it and upload it below.
      snapshot = new Map()
      settingsSnapshot = ''
      saveSettings({ syncedUserId: userId })
      set({ phase: 'syncing', at: new Date() })
    } else {
      replaceEntries(merged)
      snapshot = new Map(merged.map((e) => [e.id, entryKey(e)]))
      // The server's profile wins on a new device, so nobody is asked to introduce themselves twice.
      const profilePatch = profile.ownerName || profile.handle ? profile : belongsToSomeoneElse ? { ownerName: '', dedication: '', handle: '' } : {}
      saveSettings({ ...profilePatch, syncedUserId: userId })
      settingsSnapshot = settingsKey({ ...current, ...profilePatch })
      set({ phase: 'idle', at: new Date() })
    }
  } catch (e) {
    set({ phase: 'error', error: e.message ?? 'Sync failed' })
  } finally {
    pulling = false
  }

  unsubscribe?.()
  unsubscribe = subscribe(queueChanges)
  queueChanges()
}

export function stopSync() {
  unsubscribe?.()
  unsubscribe = null
  userId = null
  snapshot = new Map()
  settingsSnapshot = ''
  set({ phase: 'off', error: null, pending: 0 })
}

/** Uploads a diary that was written in this browser before signing in. */
export async function uploadLocalDiary() {
  if (!userId) return
  set({ phase: 'syncing' })
  snapshot = new Map()
  await queueChanges(true)
}

function queueChanges(force = false) {
  if (!userId || pulling) return pushing
  const entries = listEntries()
  const settings = getSettings()
  const jobs = []

  for (const entry of entries) {
    if (entry.inLockbin && !entry.moments.some((m) => m.body.trim()) && snapshot.has(entry.id)) continue
    const key = entryKey(entry)
    if (force || snapshot.get(entry.id) !== key) jobs.push({ kind: 'entry', entry, key })
  }
  for (const id of snapshot.keys()) {
    if (!entries.some((e) => e.id === id)) jobs.push({ kind: 'delete', id })
  }
  if (force || settingsKey(settings) !== settingsSnapshot) jobs.push({ kind: 'settings', settings })

  if (!jobs.length) return pushing
  set({ pending: state.pending + jobs.length, phase: 'syncing' })

  pushing = pushing.then(async () => {
    for (const job of jobs) {
      try {
        if (job.kind === 'entry') {
          await pushEntry(job.entry, userId)
          snapshot.set(job.entry.id, entryKey(job.entry)) // re-read: uploads add storage paths
        } else if (job.kind === 'delete') {
          await deleteEntry(job.id)
          snapshot.delete(job.id)
        } else {
          await pushProfile(job.settings, userId)
          settingsSnapshot = settingsKey(job.settings)
        }
        set({ pending: Math.max(0, state.pending - 1) })
      } catch (e) {
        set({ phase: 'error', error: e.message ?? 'Couldn’t save to the server', pending: 0 })
        return
      }
    }
    set({ phase: 'idle', at: new Date(), error: null, pending: 0 })
  })
  return pushing
}

// Follow the session: start on sign-in, stop on sign-out.
if (cloudEnabled) {
  supabase.auth.getSession().then(({ data }) => data.session && startSync(data.session))
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) stopSync()
    else if (session.user.id !== userId) startSync(session)
  })
}
