// The public side: what anyone browsing About You can see.
// Every entry passes through publicView() — private entries, private moments and Lockbin
// entries are dropped here, before anything renders. (On Supabase, RLS does this server-side.)

import { useEffect, useState } from 'react'
import { dedicationOf, getSettings, listEntries, publicView } from './store.js'
import { toDateKey } from './date.js'
import { cloudEnabled } from './supabase.js'
import { fetchPublicDiaries, fetchPublicDiary } from './cloud.js'
import { useStoreVersion } from './useStore.js'

function shape(diary) {
  const entries = diary.entries.map(publicView).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
  return {
    handle: diary.handle,
    ownerName: diary.ownerName,
    dedication: dedicationOf(diary),
    mine: Boolean(diary.mine),
    entries,
    count: entries.length,
    firstDate: entries.at(-1)?.date ?? null,
    latest: entries[0] ?? null,
  }
}

function ownDiary() {
  const s = getSettings()
  if (!s.handle || !s.ownerName) return null
  return { handle: s.handle, ownerName: s.ownerName, dedication: s.dedication, mine: true, entries: listEntries() }
}

/**
 * Diaries open to read, most recently written first.
 * Your own always appears — even with nothing public yet — so it never looks like it vanished.
 */
export function listPublicDiaries() {
  return [ownDiary()]
    .filter(Boolean)
    .map(shape)
    .filter((d) => d.count > 0 || d.mine)
    .sort((a, b) => (b.latest?.date ?? '').localeCompare(a.latest?.date ?? ''))
}

export function getPublicDiary(handle) {
  const raw = [ownDiary()].find((d) => d && d.handle === handle)
  return raw ? shape(raw) : null
}

/** Handles already in use by other diaries. Empty locally; the server's unique index enforces it for real. */
export const takenHandles = () => []

// ── reading the public side ──────────────────────────────────────────────────
// This browser's own diary shows at once; everyone else's arrives from the server a moment later.

const mergeByHandle = (mine, remote) => {
  const byHandle = new Map(remote.map((d) => [d.handle, d]))
  for (const d of mine) byHandle.set(d.handle, d) // your own copy is the fresher one
  return [...byHandle.values()].sort((a, b) => (b.latest?.date ?? '').localeCompare(a.latest?.date ?? ''))
}

/** All diaries open to read: yours plus everyone else's. */
export function usePublicDiaries() {
  const v = useStoreVersion()
  const [remote, setRemote] = useState([])
  const [loading, setLoading] = useState(cloudEnabled)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!cloudEnabled) return
    let live = true
    setLoading(true)
    fetchPublicDiaries()
      .then((d) => live && (setRemote(d), setError(null)))
      .catch((e) => live && setError(e.message ?? 'Couldn’t reach the server'))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [v])

  return { diaries: mergeByHandle(listPublicDiaries(), remote), loading, error }
}

/** The Following feed, with each followed diary fetched from the server. */
export function useFollowingFeed({ limit = 60, seenAt } = {}) {
  const v = useStoreVersion()
  const [remote, setRemote] = useState([])
  const [loading, setLoading] = useState(cloudEnabled)
  const handles = (getSettings().follows ?? []).map((f) => f.handle).join(',')

  useEffect(() => {
    if (!cloudEnabled || !handles) return setLoading(false)
    let live = true
    setLoading(true)
    Promise.all(handles.split(',').map((h) => fetchPublicDiary(h).catch(() => null)))
      .then((list) => live && setRemote(list.filter(Boolean)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [handles, v])

  return { ...followingFeed({ limit, seenAt, extra: remote }), loading }
}

/** One diary by handle — yours if it's yours, otherwise the server's. */
export function usePublicDiary(handle) {
  const v = useStoreVersion()
  const local = getPublicDiary(handle)
  const [remote, setRemote] = useState(null)
  const [loading, setLoading] = useState(cloudEnabled && !local)

  useEffect(() => {
    if (!cloudEnabled || local) return
    let live = true
    setLoading(true)
    fetchPublicDiary(handle)
      .then((d) => live && setRemote(d))
      .catch(() => live && setRemote(null))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [handle, v, Boolean(local)])

  return { diary: local ?? remote, loading }
}

/**
 * The Following feed: public entries from every followed diary, newest first.
 * Only what visitors can see ever appears — the same publicView() filter as everywhere else.
 * Returns { diaries, items: [{ diary, entry, isNew }] }.
 */
export function followingFeed({ limit = 60, seenAt, extra = [] } = {}) {
  const s = getSettings()
  const last = seenAt === undefined ? s.feedSeenAt : seenAt
  // Timestamps are UTC; diary days are Manila days — compare like with like.
  const seenDay = last ? toDateKey(new Date(last)) : null
  const diaries = []
  const items = []

  const fromServer = new Map(extra.map((d) => [d.handle, d]))
  for (const f of s.follows ?? []) {
    const d = getPublicDiary(f.handle) ?? fromServer.get(f.handle)
    if (!d || d.mine) continue
    diaries.push({ ...d, since: f.since })
    // Before the first visit, "new" means written on or after the day you followed;
    // after a visit, only days later than that visit count as new.
    const followDay = toDateKey(new Date(f.since))
    const isNew = (date) => (seenDay ? date > seenDay && date >= followDay : date >= followDay)
    for (const entry of d.entries) items.push({ diary: d, entry, isNew: isNew(entry.date) })
  }

  items.sort((a, b) => {
    if (a.entry.date !== b.entry.date) return b.entry.date.localeCompare(a.entry.date)
    const at = a.entry.moments.map((m) => m.time).sort().at(-1) ?? ''
    const bt = b.entry.moments.map((m) => m.time).sort().at(-1) ?? ''
    return bt.localeCompare(at)
  })

  return { diaries, items: items.slice(0, limit), total: items.length }
}
