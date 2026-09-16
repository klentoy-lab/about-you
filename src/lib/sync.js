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
let retryTimer = null
const RETRY_MS = 30_000

const state = { phase: 'off', error: null, at: null, pending: 0 }
const listeners = new Set()
const set = (patch) => {
  Object.assign(state, patch)
  listeners.forEach((fn) => fn())
}

export const syncState = () => state
export const useSync = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), syncState)

const entryKey = (e) => JSON.stringify(e)

// How much is in an entry — used to break ties so an empty copy never replaces a written one.
const weight = (e) =>
  (e.moments ?? []).reduce((n, m) => n + (m.body?.trim().length ?? 0), 0) +
  (e.media?.length ?? 0) * 1000 +
  (e.track ? 1000 : 0) +
  (e.mood ? 1 : 0)

const time = (iso) => (iso ? Date.parse(iso) || 0 : 0)

/** Union of both sides by entry id (falling back to date), keeping the better copy of each day. */
export function mergeEntries(local, remote) {
  const byDate = new Map()
  const fromServer = new Set()
  for (const r of remote) {
    byDate.set(r.date, r)
    fromServer.add(r.id)
  }
  for (const l of local) {
    const r = byDate.get(l.date)
    if (!r) {
      byDate.set(l.date, l) // only here: keep it, it will be uploaded
      continue
    }
    // An empty server copy never replaces real writing. It can look "newer" only because it was
    // uploaded moments after the writing happened (or its moments failed to save), and a sealed
    // entry arrives without content while the Lockbin is locked.
    const serverEmptyLocalWritten = weight(r) <= 1 && weight(l) > 1
    const localNewer = time(l.updatedAt) > time(r.updatedAt)
    if (serverEmptyLocalWritten || localNewer) {
      // keep this browser's copy, under the server's id so the upload updates the same row
      byDate.set(l.date, { ...l, id: r.id })
      fromServer.delete(r.id)
    }
  }
  return { entries: [...byDate.values()], fromServer }
}
const settingsKey = (s) => JSON.stringify([s.ownerName, s.dedication, s.handle, s.defaultVisibility])

/** Signed in: pull everything, then keep pushing changes as they happen. */
export async function startSync(session) {
  if (!cloudEnabled || !session) return
  userId = session.user.id
  set({ phase: 'syncing', error: null })

  try {
    pulling = true
    const [profile, remoteEntries] = await Promise.all([pullProfile(userId), pullMyEntries()])

    const current = getSettings()
    // Was this browser's diary written while signed into a different account? Then it isn't ours to merge.
    const belongsToSomeoneElse = Boolean(current.syncedUserId) && current.syncedUserId !== userId
    const local = belongsToSomeoneElse ? [] : listEntries()

    // Merge day by day. The server never silently overwrites writing that only exists here:
    // whichever copy is newer — or has more in it — wins, and a local winner is pushed back up.
    const { entries: merged, fromServer } = mergeEntries(local, remoteEntries)
    replaceEntries(merged)
    snapshot = new Map(merged.filter((e) => fromServer.has(e.id)).map((e) => [e.id, entryKey(e)]))

    // Profile: the server's wins when it has one (so nobody introduces themselves twice);
    // if the server's is still empty, this browser's name is sent up.
    const serverHasProfile = Boolean(profile.ownerName || profile.handle)
    if (serverHasProfile) {
      saveSettings({ ...profile, syncedUserId: userId })
      settingsSnapshot = settingsKey({ ...current, ...profile })
    } else {
      if (belongsToSomeoneElse) saveSettings({ ownerName: '', dedication: '', handle: '' })
      saveSettings({ syncedUserId: userId })
      settingsSnapshot = '' // forces the local profile to be pushed
    }
    set({ phase: 'syncing', at: new Date() })
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
  clearTimeout(retryTimer)
  unsubscribe?.()
  unsubscribe = null
  userId = null
  snapshot = new Map()
  settingsSnapshot = ''
  set({ phase: 'off', error: null, pending: 0 })
}

/** "Sync now": sends everything in this browser up again, whatever the last attempt thought. */
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
  // The profile goes first, so one stubborn entry can never keep your name off the server.
  if (force || settingsKey(settings) !== settingsSnapshot) jobs.unshift({ kind: 'settings', settings })

  if (!jobs.length) {
    if (state.phase === 'syncing' && !state.pending) set({ phase: 'idle', at: new Date(), error: null })
    return pushing
  }
  clearTimeout(retryTimer)
  set({ pending: state.pending + jobs.length, phase: 'syncing' })

  pushing = pushing.then(async () => {
    let firstError = null
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
      } catch (e) {
        firstError ??= e.message ?? 'Couldn’t save to the server' // keep going: other days may still save
      }
      set({ pending: Math.max(0, state.pending - 1) })
    }
    if (firstError) {
      set({ phase: 'error', error: firstError, pending: 0 })
      // Nothing was lost locally; try again on its own in a little while.
      retryTimer = setTimeout(() => queueChanges(), RETRY_MS)
    } else {
      set({ phase: 'idle', at: new Date(), error: null, pending: 0 })
    }
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
