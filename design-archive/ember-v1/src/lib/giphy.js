// GIF search through the Giphy API.
// Needs a free key from https://developers.giphy.com — put it in .env.local as VITE_GIPHY_API_KEY.
// A key in a browser bundle is visible to anyone; before launch, proxy these calls through a
// Supabase Edge Function so the key stays on the server.

const KEY = import.meta.env.VITE_GIPHY_API_KEY
const BASE = 'https://api.giphy.com/v1/gifs'
const PAGE = 24

export const hasGiphyKey = Boolean(KEY)

export class GiphyError extends Error {}

const pick = (images, ...names) => names.map((n) => images?.[n]).find((i) => i?.url)

function toItem(g) {
  const preview = pick(g.images, 'fixed_width', 'fixed_width_downsampled', 'downsized', 'original')
  const full = pick(g.images, 'downsized_medium', 'downsized', 'original') ?? preview
  if (!preview) return null
  return {
    id: g.id,
    title: g.title || 'GIF',
    preview: { url: preview.webp || preview.url, width: +preview.width, height: +preview.height },
    full: { url: full.url, width: +full.width, height: +full.height },
  }
}

/** Trending when `query` is empty. Returns { items, nextOffset } — nextOffset is null at the end. */
export async function searchGifs({ query = '', offset = 0, signal }) {
  if (!KEY) throw new GiphyError('missing-key')
  const params = new URLSearchParams({ api_key: KEY, limit: String(PAGE), offset: String(offset), rating: 'pg-13', bundle: 'messaging_non_clips' })
  if (query) params.set('q', query)

  let res
  try {
    res = await fetch(`${BASE}/${query ? 'search' : 'trending'}?${params}`, { signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new GiphyError('Can’t reach Giphy right now')
  }
  if (res.status === 401 || res.status === 403) throw new GiphyError('Giphy didn’t accept the API key')
  if (res.status === 429) throw new GiphyError('Too many searches — try again in a minute')
  if (!res.ok) throw new GiphyError('Giphy had a problem — try again')

  const body = await res.json()
  const items = (body.data ?? []).map(toItem).filter(Boolean)
  const p = body.pagination ?? {}
  const next = (p.offset ?? offset) + (p.count ?? items.length)
  return { items, nextOffset: items.length && next < (p.total_count ?? Infinity) ? next : null }
}
