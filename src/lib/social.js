// Hearts on public entries and follower counts — small numbers fetched in batches and shared by every view.
// Needs supabase/migrations/0003_hearts_and_counts.sql; without it the numbers simply stay hidden.

import { useEffect, useSyncExternalStore } from 'react'
import { cloudEnabled, supabase } from './supabase.js'
import { currentUserId } from './auth.js'
import {
  fetchFollowCounts,
  fetchHeartCounts,
  fetchMyHearts,
  followOnServer,
  setHeart,
  unfollowOnServer,
} from './cloud.js'
import { follow, isFollowing, unfollow } from './store.js'

const heartCounts = new Map() // entry id → hearts
const myHearts = new Set() // entry ids the signed-in reader has hearted
const followCounts = new Map() // owner id → { followers, following }
let available = cloudEnabled

let version = 0
const listeners = new Set()
const emit = () => {
  version++
  listeners.forEach((fn) => fn())
}
const useVersion = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => version)

// ── batching: every card on a page asks at once, one request goes out ─────────
const wantHearts = new Set()
const wantFollows = new Set()
let timer = null

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(flush, 30)
}

async function flush() {
  const entryIds = [...wantHearts].filter((id) => !heartCounts.has(id))
  const ownerIds = [...wantFollows].filter((id) => !followCounts.has(id))
  wantHearts.clear()
  wantFollows.clear()
  if (!available) return
  try {
    const [counts, mine, follows] = await Promise.all([
      fetchHeartCounts(entryIds),
      currentUserId() ? fetchMyHearts(entryIds) : [],
      fetchFollowCounts(ownerIds),
    ])
    entryIds.forEach((id) => heartCounts.set(id, counts[id] ?? 0))
    mine.forEach((id) => myHearts.add(id))
    ownerIds.forEach((id) => followCounts.set(id, follows[id] ?? { followers: 0, following: 0 }))
  } catch {
    available = false // the migration hasn't been run yet — keep the pages clean instead of showing zeros
  }
  emit()
}

const looksLikeServerId = (id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)

// A different reader means a different set of "mine".
if (cloudEnabled) {
  supabase.auth.onAuthStateChange(() => {
    myHearts.clear()
    heartCounts.clear()
    emit()
  })
}

// ── hearts ───────────────────────────────────────────────────────────────────

export function useHeart(entryId) {
  useVersion()
  useEffect(() => {
    if (!available || !looksLikeServerId(entryId) || heartCounts.has(entryId)) return
    wantHearts.add(entryId)
    schedule()
  }, [entryId, version]) // eslint-disable-line react-hooks/exhaustive-deps
  return {
    ready: available && heartCounts.has(entryId),
    count: heartCounts.get(entryId) ?? 0,
    hearted: myHearts.has(entryId),
  }
}

export class SignInNeeded extends Error {}

export async function toggleHeart(entryId) {
  if (!currentUserId()) throw new SignInNeeded('Sign in to leave a heart')
  const on = !myHearts.has(entryId)
  const before = heartCounts.get(entryId) ?? 0
  // show it at once; put it back if the server says no
  on ? myHearts.add(entryId) : myHearts.delete(entryId)
  heartCounts.set(entryId, Math.max(0, before + (on ? 1 : -1)))
  emit()
  try {
    await setHeart(entryId, on)
  } catch (e) {
    on ? myHearts.delete(entryId) : myHearts.add(entryId)
    heartCounts.set(entryId, before)
    emit()
    throw e
  }
}

// ── following ────────────────────────────────────────────────────────────────

export function useFollowCounts(ownerId) {
  useVersion()
  useEffect(() => {
    if (!available || !looksLikeServerId(ownerId) || followCounts.has(ownerId)) return
    wantFollows.add(ownerId)
    schedule()
  }, [ownerId, version]) // eslint-disable-line react-hooks/exhaustive-deps
  return available ? followCounts.get(ownerId) ?? null : null
}

/** Follow or unfollow a diary: this browser's list at once, the account on the server when signed in. */
export async function toggleFollow({ handle, ownerId }) {
  const userId = currentUserId()
  const on = !isFollowing(handle)
  on ? follow(handle, ownerId) : unfollow(handle)
  const counts = ownerId && followCounts.get(ownerId)
  if (counts) followCounts.set(ownerId, { ...counts, followers: Math.max(0, counts.followers + (on ? 1 : -1)) })
  emit()
  if (!userId) return
  try {
    on ? await followOnServer({ handle, ownerId }, userId) : await unfollowOnServer({ handle, ownerId }, userId)
  } catch (e) {
    on ? unfollow(handle) : follow(handle, ownerId)
    if (counts) followCounts.set(ownerId, counts)
    emit()
    throw e
  }
}

export const countLabel = (n, one, many) => `${n.toLocaleString('en-PH')} ${n === 1 ? one : many}`
