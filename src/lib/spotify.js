// Song of the day from a Spotify link.
// Uses Spotify's public oEmbed endpoint (no key, allows browser requests) for the title and artwork.
// oEmbed doesn't include the artist, so that's an optional field the writer can fill in;
// the Spotify player itself shows it once playing.

const KINDS = ['track', 'album', 'playlist', 'episode', 'show']

export class SpotifyError extends Error {}

/**
 * Accepts: https://open.spotify.com/track/ID?si=…, …/intl-fil/track/ID, spotify:track:ID.
 * Returns { kind, id } or null.
 */
export function parseSpotify(input) {
  const s = input.trim()
  const uri = s.match(/^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]{22})$/)
  if (uri) return { kind: uri[1], id: uri[2] }
  try {
    const u = new URL(s)
    if (u.hostname !== 'open.spotify.com') return null
    const parts = u.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'))
    const [kind, id] = parts.slice(-2)
    if (KINDS.includes(kind) && /^[A-Za-z0-9]{22}$/.test(id)) return { kind, id }
  } catch {
    /* not a URL */
  }
  return null
}

export const isShortLink = (s) => /^https?:\/\/(spotify\.link|spotify\.app\.link)\//i.test(s.trim())

export const spotifyUrl = ({ kind, id }) => `https://open.spotify.com/${kind}/${id}`
export const embedUrl = ({ kind, id }) => `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`

/** Fetches title and artwork for a pasted link. Resolves to a track object for the entry. */
export async function fetchSpotify(input) {
  if (isShortLink(input)) {
    throw new SpotifyError('Short spotify.link links can’t be read — in Spotify use Share → Copy Song Link and paste that')
  }
  const ref = parseSpotify(input)
  if (!ref) throw new SpotifyError('That doesn’t look like a Spotify link — it should start with open.spotify.com')

  let res
  try {
    res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl(ref))}`)
  } catch {
    throw new SpotifyError('Can’t reach Spotify right now — check your connection')
  }
  if (res.status === 404 || res.status === 400) throw new SpotifyError('Spotify couldn’t find that song')
  if (!res.ok) throw new SpotifyError('Spotify had a problem — try again')

  const data = await res.json()
  return {
    provider: 'spotify',
    kind: ref.kind,
    id: ref.id,
    url: spotifyUrl(ref),
    title: data.title || 'Untitled',
    artist: '',
    artwork: data.thumbnail_url || null,
    note: '',
    addedAt: new Date().toISOString(),
  }
}
