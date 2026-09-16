// The public side: what anyone browsing Ember can see.
// Every entry passes through publicView() — private entries, private moments and Lockbin
// entries are dropped here, before anything renders. (On Supabase, RLS does this server-side.)

import { dedicationOf, getSettings, listEntries, publicView } from './store.js'
import { sampleDiaries } from './samples.js'

function shape(diary) {
  const entries = diary.entries.map(publicView).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
  return {
    handle: diary.handle,
    ownerName: diary.ownerName,
    dedication: dedicationOf(diary),
    sample: Boolean(diary.sample),
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

/** All diaries with at least one public entry, most recently written first. */
export function listPublicDiaries() {
  return [ownDiary(), ...sampleDiaries()]
    .filter(Boolean)
    .map(shape)
    .filter((d) => d.count > 0)
    .sort((a, b) => (b.latest?.date ?? '').localeCompare(a.latest?.date ?? ''))
}

export function getPublicDiary(handle) {
  const raw = [ownDiary(), ...sampleDiaries()].find((d) => d && d.handle === handle)
  return raw ? shape(raw) : null
}

export const takenHandles = () => sampleDiaries().map((d) => d.handle)
