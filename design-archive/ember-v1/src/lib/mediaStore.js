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

export async function deleteFile(id) {
  await tx('readwrite', (s) => s.delete(id))
  const url = urls.get(id)
  if (typeof url === 'string') URL.revokeObjectURL(url)
  urls.delete(id)
}

/** Object URL for a stored file, created once per session and shared. */
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
  return typeof v === 'string' || v === null ? Promise.resolve(v) : v
}

export function useFileUrl(id) {
  const cached = urls.get(id)
  const [url, setUrl] = useState(typeof cached === 'string' ? cached : null)
  useEffect(() => {
    let live = true
    getFileUrl(id).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [id])
  return url
}
