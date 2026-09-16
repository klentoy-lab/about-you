// Translates between the app's entry shape and the database tables, and moves them both ways.
// An entry in the app is one document; on the server it's a row in `entries` plus its
// moments, media_items, canvas_items and tracks. Row-level security decides what comes back.

import { supabase } from './supabase.js'
import { getFile, putFile, registerRemoteUrl } from './mediaStore.js'

const BUCKET = 'media'

// ── shaping ──────────────────────────────────────────────────────────────────

const momentToRow = (m, entry, ownerId) => ({
  id: m.id,
  entry_id: entry.id,
  owner_id: ownerId,
  occurred_at: `${m.time}:00`,
  body: m.body,
  visibility: m.visibility,
  created_at: m.createdAt,
  updated_at: m.updatedAt,
})

const mediaToRow = (m, entry, ownerId) => ({
  id: m.id,
  entry_id: entry.id,
  owner_id: ownerId,
  kind: m.kind,
  storage_path: m.storagePath ?? `${ownerId}/${entry.id}/${m.id}`,
  mime_type: m.type ?? null,
  file_name: m.name ?? null,
  width: m.width ?? null,
  height: m.height ?? null,
  duration: m.duration ?? null,
  caption: m.caption ?? '',
  sort_order: m.sortOrder ?? 0,
  created_at: m.createdAt,
})

const canvasToRow = (c, entry, ownerId) => ({
  id: c.id,
  entry_id: entry.id,
  owner_id: ownerId,
  kind: c.kind,
  source: c.source,
  title: c.title ?? '',
  src_url: c.src ?? null,
  preview_url: c.preview ?? null,
  x: c.x,
  y: c.y,
  width: c.w,
  aspect: c.aspect,
  rotation: c.rotation,
  z: c.z,
})

const trackToRow = (t, entry, ownerId) => ({
  entry_id: entry.id,
  owner_id: ownerId,
  is_track_of_day: true,
  kind: 'link',
  provider: t.provider,
  url: t.url,
  title: t.title,
  artist: t.artist || null,
  artwork_url: t.artwork || null,
  spotify_kind: t.kind,
  spotify_id: t.id,
  note: t.note ?? '',
  created_at: t.addedAt,
})

const rowToEntry = (e, moments, media, canvas, tracks) => ({
  id: e.id,
  date: e.entry_date,
  mood: e.mood,
  visibility: e.visibility,
  inLockbin: e.in_lockbin,
  mediaLayout: e.media_layout,
  createdAt: e.created_at,
  updatedAt: e.updated_at,
  moments: moments.map((m) => ({
    id: m.id,
    time: String(m.occurred_at).slice(0, 5),
    body: m.body,
    visibility: m.visibility,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  })),
  media: media.map((m) => ({
    id: m.id,
    kind: m.kind,
    type: m.mime_type ?? '',
    name: m.file_name ?? '',
    width: m.width,
    height: m.height,
    duration: m.duration,
    caption: m.caption,
    sortOrder: m.sort_order,
    createdAt: m.created_at,
    storagePath: m.storage_path,
  })),
  canvas: canvas.map((c) => ({
    id: c.id,
    kind: c.kind,
    source: c.source,
    title: c.title,
    src: c.src_url,
    preview: c.preview_url,
    x: c.x,
    y: c.y,
    w: c.width,
    aspect: c.aspect,
    rotation: c.rotation,
    z: c.z,
  })),
  track: (() => {
    const t = tracks.find((x) => x.is_track_of_day)
    if (!t) return null
    return {
      provider: t.provider,
      kind: t.spotify_kind ?? 'track',
      id: t.spotify_id,
      url: t.url,
      title: t.title,
      artist: t.artist ?? '',
      artwork: t.artwork_url,
      note: t.note ?? '',
      addedAt: t.created_at,
    }
  })(),
})

const groupBy = (rows, key) => {
  const map = new Map()
  for (const r of rows) map.set(r[key], [...(map.get(r[key]) ?? []), r])
  return map
}

/** Builds entries out of the five tables, for any set of entry rows the server returned. */
export async function hydrate(entryRows) {
  if (!entryRows.length) return []
  const ids = entryRows.map((e) => e.id)
  const [moments, media, canvas, tracks] = await Promise.all(
    ['moments', 'media_items', 'canvas_items', 'tracks'].map((table) =>
      supabase
        .from(table)
        .select('*')
        .in('entry_id', ids)
        .then(({ data, error }) => {
          if (error) throw error
          return data ?? []
        }),
    ),
  )
  const byEntry = [moments, media, canvas, tracks].map((rows) => groupBy(rows, 'entry_id'))
  return entryRows.map((e) =>
    rowToEntry(e, byEntry[0].get(e.id) ?? [], byEntry[1].get(e.id) ?? [], byEntry[2].get(e.id) ?? [], byEntry[3].get(e.id) ?? []),
  )
}

// ── reading ──────────────────────────────────────────────────────────────────

/** Everything the signed-in person can see of their own diary. */
export async function pullMyEntries() {
  const { data, error } = await supabase.from('entries').select('*').order('entry_date', { ascending: false })
  if (error) throw error
  const entries = await hydrate(data ?? [])
  await Promise.all(entries.flatMap((e) => e.media.map((m) => cacheRemoteMedia(m))))
  return entries
}

/**
 * Public diaries from the server — what any visitor may read.
 * Row-level security does the filtering: private entries and private moments never arrive.
 */
export async function fetchPublicDiaries({ limit = 200 } = {}) {
  const { data: rows, error } = await supabase
    .from('entries')
    .select('*')
    .eq('visibility', 'public')
    .eq('in_lockbin', false)
    .order('entry_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!rows?.length) return []

  const owners = [...new Set(rows.map((r) => r.owner_id))]
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').in('id', owners)
  if (pErr) throw pErr

  const entries = await hydrate(rows)
  await Promise.all(entries.flatMap((e) => e.media.map((m) => cacheRemoteMedia(m))))
  const byOwner = new Map()
  rows.forEach((row, i) => byOwner.set(row.owner_id, [...(byOwner.get(row.owner_id) ?? []), entries[i]]))

  return (profiles ?? [])
    .filter((p) => p.handle)
    .map((p) => shapeRemoteDiary(p, byOwner.get(p.id) ?? []))
    .filter((d) => d.count > 0)
}

/** One public diary by its handle. */
export async function fetchPublicDiary(handle) {
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('handle', handle).maybeSingle()
  if (error) throw error
  if (!profile) return null
  const { data: rows, error: eErr } = await supabase
    .from('entries')
    .select('*')
    .eq('owner_id', profile.id)
    .eq('visibility', 'public')
    .eq('in_lockbin', false)
    .order('entry_date', { ascending: false })
  if (eErr) throw eErr
  const entries = await hydrate(rows ?? [])
  await Promise.all(entries.flatMap((e) => e.media.map((m) => cacheRemoteMedia(m))))
  return shapeRemoteDiary(profile, entries)
}

function shapeRemoteDiary(profile, entries) {
  // Only moments the server chose to send; an entry with nothing readable isn't shown at all.
  const readable = entries.filter((e) => e.moments.some((m) => m.body.trim()) || e.media.length || e.track)
  return {
    handle: profile.handle,
    ownerName: profile.owner_name || 'Someone',
    dedication: (profile.dedication || '').trim() || profile.owner_name || 'You',
    mine: false,
    entries: readable,
    count: readable.length,
    firstDate: readable.at(-1)?.date ?? null,
    latest: readable[0] ?? null,
  }
}

export async function pullProfile(userId) {
  const [{ data: profile, error: e1 }, { data: settings, error: e2 }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('account_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])
  if (e1) throw e1
  if (e2) throw e2
  return {
    ownerName: profile?.owner_name ?? '',
    dedication: profile?.dedication ?? '',
    handle: profile?.handle ?? '',
    defaultVisibility: settings?.default_visibility ?? 'private',
  }
}

/** Points the media cache at a signed URL when this browser has no copy of the file. */
export async function cacheRemoteMedia(item) {
  if (!item.storagePath) return
  if (await getFile(item.id)) return
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(item.storagePath, 60 * 60 * 8)
  if (data?.signedUrl) registerRemoteUrl(item.id, data.signedUrl)
}

/** Downloads a file this browser is missing, so it keeps working offline afterwards. */
export async function downloadMedia(item) {
  if (!item.storagePath || (await getFile(item.id))) return
  const { data, error } = await supabase.storage.from(BUCKET).download(item.storagePath)
  if (!error && data) await putFile(item.id, data)
}

// ── writing ──────────────────────────────────────────────────────────────────

/** Uploads any photo or video of this entry that isn't on the server yet. */
async function uploadNewMedia(entry, ownerId) {
  for (const m of entry.media ?? []) {
    if (m.storagePath) continue
    const blob = await getFile(m.id)
    if (!blob) continue
    const path = `${ownerId}/${entry.id}/${m.id}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: m.type || blob.type, upsert: true })
    if (error) throw error
    m.storagePath = path // saved back with the entry below
  }
}

/** Writes one entry and its parts, removing anything deleted since the last save. */
export async function pushEntry(entry, ownerId) {
  await uploadNewMedia(entry, ownerId)

  const { error } = await supabase.from('entries').upsert({
    id: entry.id,
    owner_id: ownerId,
    entry_date: entry.date,
    mood: entry.mood,
    visibility: entry.visibility,
    in_lockbin: entry.inLockbin,
    media_layout: entry.mediaLayout,
    created_at: entry.createdAt,
  })
  if (error) throw error

  const children = [
    ['moments', (entry.moments ?? []).map((m) => momentToRow(m, entry, ownerId))],
    ['media_items', (entry.media ?? []).map((m) => mediaToRow(m, entry, ownerId))],
    ['canvas_items', (entry.canvas ?? []).map((c) => canvasToRow(c, entry, ownerId))],
  ]
  for (const [table, rows] of children) {
    if (rows.length) {
      const { error: upErr } = await supabase.from(table).upsert(rows)
      if (upErr) throw upErr
    }
    const keep = rows.map((r) => r.id)
    let del = supabase.from(table).delete().eq('entry_id', entry.id)
    if (keep.length) del = del.not('id', 'in', `(${keep.join(',')})`)
    const { error: delErr } = await del
    if (delErr) throw delErr
  }

  // one song per day: replace whatever was there
  const { error: trackDel } = await supabase.from('tracks').delete().eq('entry_id', entry.id)
  if (trackDel) throw trackDel
  if (entry.track) {
    const { error: trackErr } = await supabase.from('tracks').insert(trackToRow(entry.track, entry, ownerId))
    if (trackErr) throw trackErr
  }
}

export async function deleteEntry(entryId) {
  const { error } = await supabase.from('entries').delete().eq('id', entryId)
  if (error) throw error
}

export async function pushProfile(settings, userId) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, handle: settings.handle || null, owner_name: settings.ownerName, dedication: settings.dedication })
  if (error) throw error
  const { error: e2 } = await supabase
    .from('account_settings')
    .upsert({ user_id: userId, default_visibility: settings.defaultVisibility })
  if (e2) throw e2
}
