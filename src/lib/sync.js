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
import { deleteEntry, fetchMyFollows, pullMyEntries, pullProfile, pushEntry, pushProfile } from './cloud.js'
import { deleteFile, getFile, putFile } from './mediaStore.js'
import { lock } from './lockbin.js'
import {
  clearUnclaimed,
  deleteEntry as removeLocalEntry,
  getSettings,
  listEntries,
  planSignIn,
  readUnclaimed,
  replaceEntries,
  resetAccountData,
  saveSettings,
  stashUnclaimed,
  subscribe,
  uid,
} from './store.js'

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
    // Decide what this browser's copy is before anything is fetched or merged. A diary only ever
    // merges into the account it was written in — never into whoever happens to sign in next.
    const before = getSettings()
    const plan = planSignIn({ syncedUserId: before.syncedUserId, entryCount: listEntries().length, ownerName: before.ownerName }, userId)
    if (plan === 'forget') await forgetBrowserDiary()
    if (plan === 'ask') {
      stashUnclaimed({ entries: listEntries(), profile: pickProfile(before), at: new Date().toISOString() })
      resetAccountData() // the blobs stay: the stash still points at them
    }

    const [profile, remoteEntries] = await Promise.all([pullProfile(userId), pullMyEntries()])
    const current = getSettings()
    const local = plan === 'keep' ? listEntries() : []

    // Merge day by day. The server never silently overwrites writing that only exists here:
    // whichever copy is newer — or has more in it — wins, and a local winner is pushed back up.
    const { entries: merged, fromServer } = mergeEntries(local, remoteEntries)
    replaceEntries(merged)
    snapshot = new Map(merged.filter((e) => fromServer.has(e.id)).map((e) => [e.id, entryKey(e)]))

    // Profile: the server's wins when it has one (so nobody introduces themselves twice);
    // if the server's is still empty, this account's name as written here is sent up.
    const serverHasProfile = Boolean(profile.ownerName || profile.handle)
    if (serverHasProfile) {
      saveSettings({ ...profile, syncedUserId: userId })
      settingsSnapshot = settingsKey({ ...current, ...profile })
    } else {
      saveSettings({ syncedUserId: userId })
      settingsSnapshot = current.ownerName ? '' : settingsKey(current) // push a name only if there is one
    }
    await pullFollows()
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

const pickProfile = (s) => ({ ownerName: s.ownerName, dedication: s.dedication, handle: s.handle, defaultVisibility: s.defaultVisibility })

/** Removes every trace of the current diary from this browser: entries, profile, follows, passcode, photos. */
async function forgetBrowserDiary(entries = listEntries()) {
  await Promise.all(entries.flatMap((e) => (e.media ?? []).map((m) => deleteFile(m.id).catch(() => {}))))
  resetAccountData()
  lock()
}

/** Replaces the local follow list with this account's, from the server. */
async function pullFollows() {
  try {
    const follows = await fetchMyFollows(userId)
    saveSettings({ follows })
  } catch {
    /* follows are a nicety — keep whatever is here */
  }
}

/**
 * Signing out: finish sending what's pending, then forget the diary in this browser so the next
 * person to use it starts clean. Returns false (and keeps everything) if unsent writing would be lost,
 * unless `force` is set.
 */
export async function signOutAndForget({ force = false } = {}) {
  if (userId) {
    await queueChanges()
    await pushing
    if (state.phase === 'error' && !force) return false
  }
  stopSync()
  await forgetBrowserDiary()
  await discardUnclaimed()
  return true
}

// ── a diary written before signing in ────────────────────────────────────────

/** Adds the set-aside diary to the signed-in account, under fresh ids so it can never collide with anyone's rows. */
export async function claimUnclaimed() {
  const stash = readUnclaimed()
  if (!stash || !userId) return
  const byDate = new Map(listEntries().map((e) => [e.date, e]))

  for (const old of stash.entries ?? []) {
    const media = []
    for (const m of old.media ?? []) {
      const blob = await getFile(m.id).catch(() => null)
      if (!blob) continue // lives only on someone else's server copy — nothing here to bring along
      const id = uid()
      await putFile(id, blob)
      await deleteFile(m.id).catch(() => {})
      media.push({ ...m, id, storagePath: undefined })
    }
    const moments = (old.moments ?? []).map((m) => ({ ...m, id: uid() }))
    const canvas = (old.canvas ?? []).map((c) => ({ ...c, id: uid() }))
    const existing = byDate.get(old.date)
    const next = existing
      ? {
          ...existing,
          mood: existing.mood ?? old.mood,
          track: existing.track ?? old.track,
          moments: [...existing.moments, ...moments],
          media: [...existing.media, ...media],
          canvas: [...(existing.canvas ?? []), ...canvas],
          updatedAt: new Date().toISOString(),
        }
      : { ...old, id: uid(), moments, media, canvas, updatedAt: new Date().toISOString() }
    byDate.set(old.date, next)
  }
  replaceEntries([...byDate.values()])

  if (!getSettings().ownerName && stash.profile?.ownerName) saveSettings(stash.profile)
  clearUnclaimed()
}

/** Throws the set-aside diary away, photos included. */
export async function discardUnclaimed() {
  const stash = readUnclaimed()
  if (!stash) return
  await Promise.all((stash.entries ?? []).flatMap((e) => (e.media ?? []).map((m) => deleteFile(m.id).catch(() => {}))))
  clearUnclaimed()
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
        if (job.kind === 'entry' && belongsToAnotherAccount(e)) setAside(job.entry)
        else firstError ??= e.message ?? 'Couldn’t save to the server' // keep going: other days may still save
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

// The server refuses to update a row another account owns. That day was copied into this browser from
// someone else's diary (before accounts were kept apart), so it leaves this account's diary and waits
// in the "written before you signed in" prompt, where its writer can add it or throw it away.
const belongsToAnotherAccount = (e) => e?.code === '42501' && /"entries"/.test(e.message ?? '')

function setAside(entry) {
  const stash = readUnclaimed() ?? { entries: [], profile: {}, at: new Date().toISOString() }
  stashUnclaimed({ ...stash, entries: [...stash.entries.filter((e) => e.id !== entry.id), entry] })
  removeLocalEntry(entry.date)
}

// Follow the session: start on sign-in, stop on sign-out.
if (cloudEnabled) {
  supabase.auth.getSession().then(({ data }) => data.session && startSync(data.session))
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) stopSync()
    else if (session.user.id !== userId) startSync(session)
  })
}
