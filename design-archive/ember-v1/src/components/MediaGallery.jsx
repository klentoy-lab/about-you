import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import Lightbox from './Lightbox.jsx'
import { useFileUrl } from '../lib/mediaStore.js'

/** Stable pseudo-random number in [-1, 1] from an id, so collage tilt never jumps between renders. */
function wobble(id, salt = 0) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return ((h >>> 0) % 2001) / 1000 - 1
}

/**
 * Photos and videos for one entry.
 * layout "grid" — tidy squares.  layout "collage" — natural shapes, taped in at a slight tilt.
 */
export default function MediaGallery({ items, layout = 'grid', editable = false, onCaption, onRemove, meta }) {
  const [open, setOpen] = useState(null)
  if (!items?.length) return null

  const lightboxItems = items.map((m) => ({ ...m, meta }))
  const collage = layout === 'collage'

  return (
    <>
      <ul
        className={
          collage
            ? 'flex flex-wrap items-start gap-x-2 gap-y-8 py-4 pl-2'
            : `grid gap-3 ${items.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`
        }
      >
        {items.map((item, i) => (
          <li
            key={item.id}
            className={collage ? collageWidth(item, items.length) : ''}
            style={
              collage
                ? {
                    transform: `rotate(${(wobble(item.id) * 3.5).toFixed(2)}deg) translateY(${(wobble(item.id, 7) * 10).toFixed(1)}px)`,
                    marginLeft: i === 0 ? 0 : '-1.25rem',
                    zIndex: i + 1,
                    position: 'relative',
                  }
                : undefined
            }
          >
            <Tile
              item={item}
              collage={collage}
              square={!collage && items.length > 1}
              editable={editable}
              onOpen={() => setOpen(i)}
              onCaption={onCaption}
              onRemove={onRemove}
            />
          </li>
        ))}
      </ul>

      <Lightbox items={lightboxItems} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </>
  )
}

function collageWidth(item, count) {
  const portrait = item.height > item.width
  if (count === 1) return portrait ? 'w-[62%]' : 'w-[88%]'
  return portrait ? 'w-[40%] md:w-[31%]' : 'w-[56%] md:w-[44%]'
}

function Tile({ item, collage, square, editable, onOpen, onCaption, onRemove }) {
  const url = useFileUrl(item.id)
  const [confirm, setConfirm] = useState(false)
  const ratio = square ? '1 / 1' : `${item.width} / ${item.height}`

  return (
    <figure className="group/tile">
      <div className={`relative bg-mist ${collage ? 'p-2 pb-3' : 'p-1.5'}`} style={{ borderRadius: 'var(--radius-media)' }}>
        {collage && (
          <span
            aria-hidden
            className="absolute -top-2.5 left-1/2 z-10 h-5 w-16 bg-vanilla/70"
            style={{ transform: `translateX(-50%) rotate(${(wobble(item.id, 3) * 6).toFixed(1)}deg)` }}
          />
        )}
        <div className="relative w-full overflow-hidden bg-fog" style={{ aspectRatio: ratio, borderRadius: 'var(--radius-media)' }}>
          {url &&
            (item.kind === 'video' ? (
              <InlineVideo url={url} onExpand={onOpen} label={item.caption || 'Video'} />
            ) : (
              <button type="button" onClick={onOpen} className="block h-full w-full cursor-zoom-in" aria-label={`Open ${item.caption || 'photo'}`}>
                <img src={url} alt={item.caption || ''} loading="lazy" draggable={false} className="h-full w-full object-cover" />
              </button>
            ))}
        </div>
      </div>

      {(editable || item.caption) && (
        <figcaption className="type-meta mt-2 flex items-start gap-3">
          {editable ? (
            <input
              value={item.caption}
              onChange={(e) => onCaption(item.id, e.target.value)}
              maxLength={120}
              placeholder="Caption"
              aria-label="Caption"
              className="type-meta min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-vanilla placeholder:text-vanilla/30 hover:border-vanilla/30 focus:border-mango focus:outline-none focus-visible:outline-none"
            />
          ) : (
            <span className="py-1 text-vanilla/80">{item.caption}</span>
          )}
          {editable && (
            <button
              type="button"
              onClick={() => (confirm ? onRemove(item.id) : setConfirm(true))}
              onBlur={() => setConfirm(false)}
              className={`shrink-0 py-1 hover:text-mango ${
                confirm ? 'text-mango' : 'text-vanilla/40 opacity-0 group-hover/tile:opacity-100 focus:opacity-100'
              }`}
            >
              {confirm ? 'Remove — sure?' : 'Remove'}
            </button>
          )}
        </figcaption>
      )}
    </figure>
  )
}

/** Plays muted while on screen; click for sound. Reduced motion: stays still until clicked. */
function InlineVideo({ url, onExpand, label }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v || reduce) return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.4 })
    io.observe(v)
    return () => io.disconnect()
  }, [url, reduce])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) {
      v.muted = false
      setMuted(false)
      v.play().catch(() => {})
    } else {
      v.muted = !v.muted
      setMuted(v.muted)
    }
  }

  return (
    <>
      <video
        ref={ref}
        src={url}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={!playing ? `Play ${label}` : muted ? `Turn sound on for ${label}` : `Mute ${label}`}
        className="absolute inset-0 h-full w-full"
      />
      <span className="type-meta pointer-events-none absolute bottom-2 left-2 bg-ink px-1.5 py-0.5 text-vanilla">
        {!playing ? 'Play' : muted ? 'Sound off' : 'Sound on'}
      </span>
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Open ${label} full screen`}
        className="type-meta absolute right-2 top-2 bg-ink px-1.5 py-0.5 text-vanilla hover:text-mango"
      >
        Full
      </button>
    </>
  )
}
