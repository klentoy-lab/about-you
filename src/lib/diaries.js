// The public side: what anyone browsing About You can see.
// Every entry passes through publicView() — private entries, private moments and Lockbin
// entries are dropped here, before anything renders. (On Supabase, RLS does this server-side.)

import { dedicationOf, getSettings, listEntries, publicView } from './store.js'
import { toDateKey } from './date.js'

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

/**
 * The Following feed: public entries from every followed diary, newest first.
 * Only what visitors can see ever appears — the same publicView() filter as everywhere else.
 * Returns { diaries, items: [{ diary, entry, isNew }] }.
 */
export function followingFeed({ limit = 60, seenAt } = {}) {
  const s = getSettings()
  const last = seenAt === undefined ? s.feedSeenAt : seenAt
  // Timestamps are UTC; diary days are Manila days — compare like with like.
  const seenDay = last ? toDateKey(new Date(last)) : null
  const diaries = []
  const items = []

  for (const f of s.follows ?? []) {
    const d = getPublicDiary(f.handle)
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
