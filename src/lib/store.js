// Local-first persistence while the Supabase backend isn't connected.
// The shapes mirror supabase/migrations/0001_init.sql so this module can be swapped
// for a Supabase adapter (same function names) once auth is wired in.

const KEY = 'ember:v1'

export const VISIBILITY = ['private', 'unlisted', 'public']
const RANK = { private: 0, unlisted: 1, public: 2 }

/** A moment is never more visible than its entry — mirrors the RLS policy. */
export const effectiveVisibility = (entry, moment) =>
  RANK[moment.visibility] <= RANK[entry.visibility] ? moment.visibility : entry.visibility

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

const DEFAULT_SETTINGS = {
  ownerName: '',
  dedication: '',
  handle: '',
  defaultVisibility: 'private',
  lockbin: null,
  syncedUserId: null, // which account this browser's diary last belonged to
  follows: [], // [{ handle, since: ISO }] — diaries this reader follows
  feedSeenAt: null, // ISO of the last visit to the Following feed, for "new" markers
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw)
      return { ...db, settings: { ...DEFAULT_SETTINGS, ...db.settings } }
    }
  } catch {
    /* corrupted or blocked storage — start fresh */
  }
  return { settings: { ...DEFAULT_SETTINGS }, entries: {} }
}

// ── change notifications, so every view stays in step ────────────────────────
const listeners = new Set()
let version = 0
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn))
export const getVersion = () => version
export function notifyChanged() {
  version++
  listeners.forEach((fn) => fn())
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => e.key === KEY && notifyChanged())
}

function write(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* quota or private mode — the UI keeps working in memory */
  }
  notifyChanged()
}

// ── settings ─────────────────────────────────────────────────────────────────

export function getSettings() {
  return read().settings
}

export function saveSettings(patch) {
  const db = read()
  db.settings = { ...db.settings, ...patch }
  write(db)
  return db.settings
}

// ── following ────────────────────────────────────────────────────────────────
// Mirrors the `follows` table: a reader follows a diary by handle (and its owner's id, once known).

export const listFollows = () => getSettings().follows ?? []

export const isFollowing = (handle) => listFollows().some((f) => f.handle === handle)

export function follow(handle, ownerId = null) {
  if (!handle || isFollowing(handle)) return
  saveSettings({ follows: [...listFollows(), { handle, ownerId, since: new Date().toISOString() }] })
}

export function unfollow(handle) {
  saveSettings({ follows: listFollows().filter((f) => f.handle !== handle) })
}

export const markFeedSeen = () => saveSettings({ feedSeenAt: new Date().toISOString() })

/** The name the diary is for — falls back to the owner's own name. */
export const dedicationOf = (s) => (s.dedication || '').trim() || (s.ownerName || '').trim()

export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30)

// ── entries ──────────────────────────────────────────────────────────────────

export function newMoment(visibility, time) {
  const now = new Date().toISOString()
  return { id: uid(), time, body: '', visibility, createdAt: now, updatedAt: now }
}

const withDefaults = (e) => ({ inLockbin: false, media: [], mediaLayout: 'grid', canvas: [], track: null, ...e })

/** Returns the stored entry, or a fresh unsaved draft for that date. */
export function getEntry(date) {
  const db = read()
  if (db.entries[date]) return withDefaults(db.entries[date])
  return {
    id: uid(),
    date,
    mood: null,
    visibility: db.settings.defaultVisibility,
    inLockbin: false,
    moments: [],
    media: [],
    mediaLayout: 'grid',
    canvas: [],
    track: null,
    createdAt: null,
    updatedAt: null,
  }
}

/** Every saved entry, newest first. */
export function listEntries() {
  return Object.values(read().entries)
    .map(withDefaults)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Replaces this browser's copy with what the server sent (used right after signing in). */
export function replaceEntries(list) {
  const db = read()
  db.entries = Object.fromEntries(list.map((e) => [e.date, withDefaults(e)]))
  write(db)
}

const isBlank = (entry) =>
  !entry.mood && !entry.track && !entry.media?.length && !entry.canvas?.length && entry.moments.every((m) => !m.body.trim())

/** Persists the entry and returns the saved copy. Blank drafts are not kept. */
export function saveEntry(entry) {
  const db = read()
  if (isBlank(entry) && !entry.inLockbin) {
    if (db.entries[entry.date]) {
      delete db.entries[entry.date]
      write(db)
    }
    return { ...entry, updatedAt: null }
  }
  const now = new Date().toISOString()
  const createdAt = db.entries[entry.date]?.createdAt ?? entry.createdAt ?? now
  const saved = { ...entry, createdAt, updatedAt: now }
  db.entries[entry.date] = saved
  write(db)
  return saved
}

// ── account boundaries ───────────────────────────────────────────────────────
// The browser copy belongs to exactly one account. Signing out forgets it; a diary written
// before signing in is set aside until its writer says whether it belongs to this account.

const UNCLAIMED_KEY = 'about-you:unclaimed'

/** Forgets everything personal in this browser: entries, name, dedication, follows, passcode. */
export function resetAccountData() {
  write({ settings: { ...DEFAULT_SETTINGS }, entries: {} })
}

export function stashUnclaimed(stash) {
  try {
    localStorage.setItem(UNCLAIMED_KEY, JSON.stringify(stash))
  } catch {
    /* storage full — nothing else we can do */
  }
  notifyChanged()
}

export function readUnclaimed() {
  try {
    return JSON.parse(localStorage.getItem(UNCLAIMED_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function clearUnclaimed() {
  try {
    localStorage.removeItem(UNCLAIMED_KEY)
  } catch {
    /* ignore */
  }
  notifyChanged()
}

/**
 * What to do with this browser's copy when `userId` signs in:
 *   keep    — it already belongs to this account
 *   forget  — it belongs to a different account; never show it or merge it
 *   ask     — written before anyone signed in; set it aside and let the writer decide
 *   nothing — the browser holds no diary
 */
export function planSignIn({ syncedUserId, entryCount, ownerName }, userId) {
  if (syncedUserId === userId) return 'keep'
  if (syncedUserId) return 'forget'
  return entryCount > 0 || ownerName ? 'ask' : 'nothing'
}

/** Deletes one day. Syncs as a deletion on the server too, when signed in. */
export function deleteEntry(date) {
  const db = read()
  if (!db.entries[date]) return
  delete db.entries[date]
  write(db)
}

/** Deletes every entry in this browser. Settings, follows and the passcode stay. */
export function clearEntries() {
  const db = read()
  db.entries = {}
  write(db)
}

export function setInLockbin(date, inLockbin) {
  const db = read()
  if (!db.entries[date]) return
  db.entries[date] = { ...db.entries[date], inLockbin, updatedAt: new Date().toISOString() }
  write(db)
}

/**
 * What a stranger may see of this entry: nothing if it's private or in the Lockbin,
 * otherwise only its public moments. Mirrors the server policy.
 */
export function publicView(entry) {
  if (entry.inLockbin || entry.visibility !== 'public') return null
  const moments = entry.moments.filter((m) => m.visibility === 'public' && m.body.trim())
  // Photos, video, stickers, GIFs and the song belong to the entry, so they follow the entry's visibility.
  const media = entry.media ?? []
  if (!moments.length && !media.length && !entry.track) return null
  return { ...withDefaults(entry), moments, media }
}
