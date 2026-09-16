import { useEffect, useRef, useState } from 'react'
import { SpotifyError, embedUrl, fetchSpotify } from '../lib/spotify.js'

/**
 * The song of the day, as a paper card: artwork with a record peeking out, title, artist,
 * a note with the song, and the Spotify player on demand (never a raw iframe dumped on the page).
 * Editable when onChange is given.
 */
export default function SongCard({ track, onChange, onRemove }) {
  const editable = Boolean(onChange)
  const [playing, setPlaying] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const note = useRef(null)

  useEffect(() => {
    const el = note.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [track.note])

  const isTrack = track.kind === 'track' || track.kind === 'episode'

  return (
    <article
      aria-label={`Song of the day: ${track.title}${track.artist ? ` by ${track.artist}` : ''}`}
      className="print-avoid-break relative max-w-[36rem] overflow-hidden bg-[#FFF1D6] text-ink ring-1 ring-ink/10"
      style={{ borderRadius: 'var(--radius-card)' }}
    >
      <div className="flex gap-5 p-4 pr-5 md:p-5">
        {/* artwork + record */}
        <div className="relative h-24 w-24 shrink-0 md:h-28 md:w-28">
          <div
            aria-hidden
            className={`absolute inset-0 rounded-full transition-transform duration-[1100ms] ease-soft ${playing ? 'translate-x-[42%]' : 'translate-x-[18%]'}`}
            style={{ background: 'repeating-radial-gradient(circle, #100C08 0 2px, #2C1F14 2px 4px)' }}
          >
            <div className={`absolute inset-[34%] rounded-full bg-mango ${playing ? 'motion-safe:animate-spin' : ''}`} style={{ animationDuration: '5s' }}>
              <div className="absolute inset-[38%] rounded-full bg-vanilla" />
            </div>
          </div>
          {track.artwork ? (
            <img src={track.artwork} alt="" className="relative h-full w-full object-cover" style={{ borderRadius: 8 }} draggable={false} />
          ) : (
            <div className="relative h-full w-full bg-ink" style={{ borderRadius: 8 }} />
          )}
        </div>

        <div className={`min-w-0 flex-1 transition-[padding] duration-[1100ms] ease-soft ${playing ? 'pl-8' : 'pl-3'}`}>
          <p className="type-meta flex items-center gap-2 text-ink/60">
            <SpotifyGlyph /> Song of the day
          </p>
          <h3 className="type-display mt-2 line-clamp-2 text-[clamp(22px,3vw,30px)] text-ink">{track.title}</h3>
          {editable ? (
            <input
              value={track.artist}
              onChange={(e) => onChange({ artist: e.target.value })}
              placeholder="Artist (optional)"
              maxLength={80}
              aria-label="Artist"
              className="mt-2 w-full border-b border-transparent bg-transparent pb-0.5 text-[15px] text-ink/75 placeholder:text-ink/35 hover:border-ink/20 focus:border-ink focus:outline-none focus-visible:outline-none"
            />
          ) : (
            track.artist && <p className="mt-2 text-[15px] text-ink/75">{track.artist}</p>
          )}
        </div>
      </div>

      {(editable || track.note) && (
        <div className="px-4 pb-1 md:px-5">
          {editable ? (
            <textarea
              ref={note}
              rows={1}
              value={track.note}
              onChange={(e) => onChange({ note: e.target.value })}
              maxLength={280}
              placeholder="A note with the song…"
              aria-label="A note with the song"
              className="type-serif block w-full resize-none overflow-hidden bg-transparent text-[24px] leading-snug text-ink placeholder:text-ink/35 focus:outline-none focus-visible:outline-none"
            />
          ) : (
            <p className="type-serif whitespace-pre-line text-[24px] leading-snug text-ink">{track.note}</p>
          )}
        </div>
      )}

      {playing && (
        <div className="px-3 pt-2">
          <iframe
            title={`Spotify player: ${track.title}`}
            src={embedUrl(track)}
            width="100%"
            height={isTrack ? 80 : 152}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="block w-full border-0"
            style={{ borderRadius: 12 }}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-4 pt-3 md:px-5">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          className="type-meta inline-flex min-h-9 items-center gap-2 rounded-full bg-ink px-4 text-[#FFF1D6] transition-colors duration-500 hover:bg-wine print:hidden"
        >
          {playing ? '■ Hide player' : '▶ Play'}
        </button>
        <a href={track.url} target="_blank" rel="noopener noreferrer" className="type-meta text-ink/70 underline-offset-4 hover:text-ink hover:underline">
          Open in Spotify ↗
        </a>
        {editable && (
          <button
            type="button"
            onClick={() => (confirm ? onRemove() : setConfirm(true))}
            onBlur={() => setConfirm(false)}
            className={`type-meta ml-auto ${confirm ? 'text-wine' : 'text-ink/50 hover:text-ink'}`}
          >
            {confirm ? 'Remove — sure?' : 'Remove song'}
          </button>
        )}
      </div>
    </article>
  )
}

/** Paste-a-link form. Calls onAttach(track) once Spotify confirms the song exists. */
export function MusicAttach({ onAttach, onCancel }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)

  useEffect(() => {
    input.current?.focus()
    input.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  const submit = async (e) => {
    e?.preventDefault()
    if (!value.trim()) return
    setBusy(true)
    setError('')
    try {
      onAttach(await fetchSpotify(value))
    } catch (err) {
      setError(err instanceof SpotifyError ? err.message : 'Couldn’t attach that song')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="max-w-[36rem] bg-raised p-5" style={{ borderRadius: 'var(--radius-card)' }}>
      <p className="type-meta flex items-center gap-2 text-vanilla/70">
        <SpotifyGlyph /> Song of the day
      </p>
      <p className="type-serif mt-2 text-[28px] text-vanilla">What were you listening to?</p>
      <label className="mt-4 block">
        <span className="sr-only">Spotify song link</span>
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (text) {
              e.preventDefault()
              setValue(text)
              setTimeout(() => document.getElementById('song-attach-submit')?.click(), 0)
            }
          }}
          inputMode="url"
          spellCheck={false}
          placeholder="Paste a Spotify link — open.spotify.com/track/…"
          className="w-full border-b border-vanilla/30 bg-transparent pb-2 text-[16px] text-vanilla placeholder:text-vanilla/35 focus:border-mango focus:outline-none focus-visible:outline-none"
        />
      </label>
      <p className="type-meta mt-2 normal-case tracking-normal text-vanilla/45">In Spotify: ··· → Share → Copy Song Link</p>
      {error && (
        <p role="alert" className="mt-3 text-[14px] text-mango">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button id="song-attach-submit" type="submit" disabled={busy || !value.trim()} className="chip chip-solid">
          {busy ? 'Finding it…' : 'Attach song'}
        </button>
        <button type="button" onClick={onCancel} className="chip">
          Cancel
        </button>
      </div>
    </form>
  )
}

/** One-line song mention for lists: ♪ Title — Artist */
export function SongLine({ track, className = '' }) {
  if (!track) return null
  return (
    <p className={`flex min-w-0 items-center gap-3 ${className}`}>
      {track.artwork && <img src={track.artwork} alt="" className="h-9 w-9 shrink-0 object-cover" style={{ borderRadius: 4 }} />}
      <span className="min-w-0 truncate text-[15px] text-vanilla/85">
        <span aria-hidden className="text-mango">♪ </span>
        {track.title}
        {track.artist && <span className="text-vanilla/55"> — {track.artist}</span>}
      </span>
    </p>
  )
}

function SpotifyGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
      <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.8 15.2a.66.66 0 0 1-.9.22c-2.47-1.51-5.58-1.85-9.24-1.01a.66.66 0 1 1-.3-1.28c4-.92 7.44-.52 10.22 1.17.31.19.41.6.22.9Zm1.29-2.86a.82.82 0 0 1-1.13.27c-2.83-1.74-7.14-2.24-10.48-1.23a.82.82 0 1 1-.48-1.57c3.82-1.16 8.57-.6 11.82 1.4.39.24.51.75.27 1.13Zm.11-2.98C14.8 8.84 9.2 8.65 5.96 9.63a.99.99 0 1 1-.57-1.89c3.72-1.13 9.9-.91 13.8 1.4a.99.99 0 0 1-1 1.72Z" />
    </svg>
  )
}
