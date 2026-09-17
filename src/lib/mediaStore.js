// Photo and video files for the local preview, kept in IndexedDB (localStorage is far too small).
// Entries only hold metadata ({ id, kind, width, height, caption… }); the bytes live here, keyed by id.
// On Supabase this becomes the private `media` storage bucket from the migration.

import { useEffect, useState } from 'react'

const DB_NAME = 'ember-media'
const STORE = 'files'

let dbPromise = null
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function tx(mode, run) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const t = d.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        t.oncomplete = () => resolve(req?.result)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export async function putFile(id, blob) {
  // Ask once for persistent storage so the browser doesn't evict a diary's photos under pressure.
  navigator.storage?.persist?.().catch(() => {})
  await tx('readwrite', (s) => s.put(blob, id))
}

export const getFile = (id) => tx('readonly', (s) => s.get(id))

const urls = new Map()
// Files that live on the server and haven't been downloaded here: id → signed URL.
const remote = new Map()

/** Lets a stored file be shown straight from the server when this browser has no copy. */
export function registerRemoteUrl(id, url) {
  remote.set(id, url)
  // Also when this browser already looked and found no copy (null) or is still looking:
  // a photo shown before sync finished would otherwise stay blank until the page reloads.
  if (typeof urls.get(id) !== 'string') notifyUrl(id)
}

const urlListeners = new Set()
const notifyUrl = (id) => urlListeners.forEach((fn) => fn(id))

export async function deleteFile(id) {
  await tx('readwrite', (s) => s.delete(id))
  const url = urls.get(id)
  if (typeof url === 'string') URL.revokeObjectURL(url)
  urls.delete(id)
}

/** Object URL for a stored file — this browser's copy first, otherwise the server's signed URL. */
export function getFileUrl(id) {
  if (!urls.has(id)) {
    urls.set(
      id,
      getFile(id).then((blob) => {
        const url = blob ? URL.createObjectURL(blob) : null
        urls.set(id, url)
        return url
      }),
    )
  }
  const v = urls.get(id)
  const resolved = typeof v === 'string' || v === null ? Promise.resolve(v) : v
  return resolved.then((u) => u ?? remote.get(id) ?? null)
}

export function useFileUrl(id) {
  const cached = urls.get(id)
  const [url, setUrl] = useState(typeof cached === 'string' ? cached : (remote.get(id) ?? null))
  useEffect(() => {
    let live = true
    const load = () => getFileUrl(id).then((u) => live && setUrl(u))
    load()
    const onRemote = (changed) => changed === id && load()
    urlListeners.add(onRemote)
    return () => {
      live = false
      urlListeners.delete(onRemote)
    }
  }, [id])
  return url
}
