import { useMemo, useState } from 'react'
import Lightbox from '../components/Lightbox.jsx'
import { mediaSummary } from '../components/EntryList.jsx'
import { shortDate, toDateKey } from '../lib/date.js'
import { useLockbin } from '../lib/lockbin.js'
import { useFileUrl } from '../lib/mediaStore.js'
import { moodGradient } from '../lib/moods.js'
import { listEntries } from '../lib/store.js'
import { useStoreVersion } from '../lib/useStore.js'

/** Every photo and video you've added, newest first, in one dense mosaic. */
export default function MediaWall() {
  const v = useStoreVersion()
  const unlocked = useLockbin()
  const [open, setOpen] = useState(null)

  const entries = useMemo(() => listEntries(), [v])
  const items = useMemo(
    () =>
      entries
        .filter((e) => unlocked || !e.inLockbin)
        .flatMap((e) =>
          [...e.media].reverse().map((m) => ({
            ...m,
            mood: e.mood,
            meta: shortDate(e.date),
            href: e.date === toDateKey() ? '#/' : `#/today/${e.date}`,
          })),
        ),
    [entries, unlocked],
  )
  const sealed = unlocked ? 0 : entries.filter((e) => e.inLockbin && e.media.length).length

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <p className="type-meta text-vanilla/60">
        {items.length ? mediaSummary(items) : 'Nothing yet'}
        {sealed > 0 && ` · ${sealed} ${sealed === 1 ? 'day' : 'days'} in the Lockbin not shown`}
      </p>
      <h1 className="type-display mt-4 text-[clamp(48px,8vw,120px)] text-vanilla">Media wall</h1>

      {items.length === 0 ? (
        <p className="type-body mt-8">
          Every photo and video you add to a day gathers here.{' '}
          <a href="#/" className="text-mango hover:underline">
            Add some to today.
          </a>
        </p>
      ) : (
        <ul className="mt-10 columns-2 gap-1.5 sm:columns-3 lg:columns-4 xl:columns-5">
          {items.map((item, i) => (
            <li key={item.id} className="mb-1.5 break-inside-avoid">
              <WallTile item={item} onOpen={() => setOpen(i)} />
            </li>
          ))}
        </ul>
      )}

      <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </main>
  )
}

function WallTile({ item, onOpen }) {
  const url = useFileUrl(item.id)
  const spine = moodGradient(item.mood)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${item.kind === 'video' ? 'Video' : 'Photo'} from ${item.meta}${item.caption ? ` — ${item.caption}` : ''}`}
      className="group relative block w-full cursor-zoom-in bg-mist p-1 pl-2"
      style={{ borderRadius: 'var(--radius-media)' }}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${spine ? '' : 'bg-fog'}`}
        style={spine ? { background: spine } : undefined}
      />
      <span className="relative block w-full bg-fog" style={{ aspectRatio: `${item.width} / ${item.height}` }}>
        {url &&
          (item.kind === 'video' ? (
            <video src={`${url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <img src={url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          ))}
        {item.kind === 'video' && (
          <span className="type-meta absolute bottom-1.5 left-1.5 bg-ink px-1.5 py-0.5 text-vanilla">Video</span>
        )}
        <span className="type-meta absolute right-1.5 top-1.5 bg-ink px-1.5 py-0.5 text-vanilla opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
          {item.meta}
        </span>
      </span>
    </button>
  )
}
