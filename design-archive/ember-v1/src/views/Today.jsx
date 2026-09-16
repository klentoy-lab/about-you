import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import MediaGallery from '../components/MediaGallery.jsx'
import StickerCanvas from '../components/StickerCanvas.jsx'
import { topLimit } from '../lib/canvas.js'
import StickerTray from '../components/StickerTray.jsx'
import { pushRecent } from '../lib/recentStickers.js'
import { mediaSummary } from '../components/EntryList.jsx'
import { AddMediaButton, DropSheet, LayoutToggle, UploadStatus, useFileDrop, useMediaUpload } from '../components/MediaAdd.jsx'
import { deleteFile } from '../lib/mediaStore.js'
import Moment from '../components/Moment.jsx'
import MoodPicker from '../components/MoodPicker.jsx'
import MoodSpine from '../components/MoodSpine.jsx'
import SaveIndicator from '../components/SaveIndicator.jsx'
import VisibilityToggle from '../components/VisibilityToggle.jsx'
import { TZ_LABEL, formatTime, headline, nowTime, shiftDateKey, toDateKey } from '../lib/date.js'
import { useLockbin } from '../lib/lockbin.js'
import { navigate } from '../lib/router.js'
import { effectiveVisibility, getEntry, getSettings, newMoment, saveEntry, uid } from '../lib/store.js'
import { useAutosave } from '../lib/useAutosave.js'
import { useStoreVersion } from '../lib/useStore.js'

export default function Today({ date: routeDate }) {
  const today = toDateKey()
  const date = routeDate && /^\d{4}-\d{2}-\d{2}$/.test(routeDate) && routeDate <= today ? routeDate : today
  const unlocked = useLockbin()
  useStoreVersion()
  const sealed = getEntry(date).inLockbin && !unlocked

  const goTo = (d) => navigate(d === toDateKey() ? '' : `today/${d}`)

  // Keyed by date: switching days remounts, which flushes the old day's save
  // and replays the one orchestrated "date sets itself" moment.
  return sealed ? (
    <SealedDay key={date} date={date} onDateChange={goTo} />
  ) : (
    <EntryEditor key={date} date={date} onDateChange={goTo} />
  )
}

const EASE = [0.2, 0.7, 0.2, 1]

function DateHeadline({ date }) {
  const { weekday, dayMonth, year } = headline(date)
  return (
    <h1 className="mt-8 md:mt-10" aria-label={`${weekday} ${dayMonth} ${year}`}>
      <motion.span
        className="type-display block text-[clamp(44px,4.4vw,68px)] text-vanilla"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        {weekday}
      </motion.span>
      <motion.span
        className="flex items-start gap-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.06, ease: EASE }}
      >
        <span className="type-display text-[clamp(44px,4.4vw,68px)] text-vanilla">{dayMonth}</span>
        <span className="type-meta mt-[0.4em] text-vanilla/60">{year}</span>
      </motion.span>
    </h1>
  )
}

function SealedDay({ date, onDateChange }) {
  const today = toDateKey()
  const entry = getEntry(date)
  return (
    <main className="relative min-h-[calc(100svh-56px)]">
      <MoodSpine mood={entry.mood} className="absolute inset-y-0 left-0 hidden w-[6px] md:block" />
      <div className="md:grid md:grid-cols-[clamp(300px,32vw,460px)_minmax(0,1fr)]">
        <aside className="px-5 pt-8 md:pl-12 md:pr-8 md:pt-14">
          <DayNav date={date} today={today} isToday={date === today} onDateChange={onDateChange} />
          <DateHeadline date={date} />
          <MoodSpine mood={entry.mood} horizontal className="mt-5 h-[4px] w-full md:hidden" />
        </aside>
        <section className="px-5 pb-40 pt-10 md:pl-4 md:pr-12 md:pt-[8.5rem]">
          <div className="h-40 w-full max-w-[42.5rem] bg-ink" />
          <p className="type-meta mt-4 flex gap-6 text-vanilla">
            <span>In the Lockbin</span>
            <a href="#/lockbin" className="text-mango hover:text-vanilla">
              Unlock
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}

function EntryEditor({ date, onDateChange }) {
  const [entry, setEntry] = useState(() => {
    const e = getEntry(date)
    return e.moments.length ? e : { ...e, moments: [newMoment(e.visibility, nowTime())] }
  })
  const [focusId, setFocusId] = useState(null)
  const status = useAutosave(entry, saveEntry, { initialSavedAt: entry.updatedAt })
  const settings = getSettings()

  const today = toDateKey()
  const isToday = date === today

  const moments = useMemo(
    () => [...entry.moments].sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt)),
    [entry.moments],
  )
  const privateCount = entry.moments.filter((m) => m.visibility === 'private').length
  const hasWriting = entry.moments.some((m) => m.body.trim()) || entry.media?.length > 0 || entry.canvas?.length > 0
  const publicMoments = entry.moments.filter((m) => m.visibility === 'public' && m.body.trim()).length + (entry.media?.length ?? 0)

  const update = (patch) => setEntry((e) => ({ ...e, ...patch }))

  const updateMoment = (id, patch) =>
    setEntry((e) => ({
      ...e,
      moments: e.moments.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m)),
    }))

  const addMoment = () => {
    const m = newMoment(entry.visibility, nowTime())
    setEntry((e) => ({ ...e, moments: [...e.moments, m] }))
    setFocusId(m.id)
  }

  const removeMoment = (id) =>
    setEntry((e) => {
      const rest = e.moments.filter((m) => m.id !== id)
      return { ...e, moments: rest.length ? rest : [newMoment(e.visibility, nowTime())] }
    })

  // ── photos and video ──
  const mainRef = useRef(null)
  const upload = useMediaUpload((item) => setEntry((e) => ({ ...e, media: [...(e.media ?? []), item] })))
  const dragging = useFileDrop(mainRef, upload.add)
  const media = entry.media ?? []

  const captionMedia = (id, caption) =>
    setEntry((e) => ({ ...e, media: e.media.map((m) => (m.id === id ? { ...m, caption } : m)) }))

  const removeMedia = (id) => {
    setEntry((e) => ({ ...e, media: e.media.filter((m) => m.id !== id) }))
    deleteFile(id).catch(() => {})
  }

  // ── stickers and GIFs ──
  const canvasWrap = useRef(null)
  const [trayOpen, setTrayOpen] = useState(false)
  const [selectedSticker, setSelectedSticker] = useState(null)
  const canvas = entry.canvas ?? []
  const setCanvas = (next) =>
    setEntry((e) => ({ ...e, canvas: typeof next === 'function' ? next(e.canvas ?? []) : next }))

  // A pick lands in the middle of what's on screen, slightly off-centre so repeats don't stack exactly.
  const placePick = (pick) => {
    pushRecent(pick)
    const rect = canvasWrap.current.getBoundingClientRect()
    const jitter = () => (Math.random() - 0.5) * 0.16
    const base = Math.max(60, Math.round(window.innerHeight * 0.45 - rect.top))
    const y = Math.round(base + jitter() * 400)
    const minFrac = (px) => px / Math.max(1, rect.width)
    const w = pick.kind === 'gif' ? Math.max(0.34, minFrac(180)) : Math.max(0.2, minFrac(110))
    const item = {
      id: uid(),
      ...pick,
      x: Math.min(0.85, Math.max(0.15, 0.45 + jitter())),
      y: Math.max(topLimit({ w, aspect: pick.aspect }, rect.width) + 12, y),
      w,
      rotation: Math.round(jitter() * 60),
    }
    setCanvas((list) => [...list, { ...item, z: list.reduce((m, it) => Math.max(m, it.z), -1) + 1 }])
    setSelectedSticker(item.id)
  }

  // Saved at once, not on the debounce: leaving public surfaces must be immediate.
  const moveToLockbin = () => {
    const next = { ...entry, inLockbin: true }
    saveEntry(next)
    setEntry(next)
  }

  const firstEmpty = moments.length === 1 && !moments[0].body

  return (
    <main ref={mainRef} className="relative min-h-[calc(100svh-56px)]">
      {/* Desktop spine: runs the full height of the entry on its left edge */}
      <MoodSpine mood={entry.mood} className="absolute inset-y-0 left-0 hidden w-[6px] md:block" />
      <DropSheet show={dragging} />

      <div className="md:grid md:grid-cols-[clamp(300px,32vw,460px)_minmax(0,1fr)]">
        {/* ── Gutter: date, entry controls ─────────────────────── */}
        <aside className="px-5 pt-8 md:sticky md:top-[56px] md:h-[calc(100svh-56px)] md:overflow-y-auto md:pb-10 md:pl-12 md:pr-8 md:pt-14">
          <DayNav date={date} today={today} isToday={isToday} onDateChange={onDateChange} />
          <DateHeadline date={date} />

          {/* Mobile spine: a thin bar under the date */}
          <MoodSpine mood={entry.mood} horizontal className="mt-5 h-[4px] w-full md:hidden" />

          <motion.div
            className="mt-8 flex flex-wrap items-start gap-x-10 gap-y-8 md:mt-12 md:block md:space-y-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.16 }}
          >
            <div>
              <p className="type-meta mb-2 text-vanilla/60">Entry</p>
              <VisibilityToggle value={entry.visibility} label="Entry visibility" onChange={(visibility) => update({ visibility })} />
              {entry.visibility !== 'private' && privateCount > 0 && (
                <p className="type-meta mt-2 text-vanilla/50">
                  {privateCount} of {entry.moments.length} {entry.moments.length === 1 ? 'moment' : 'moments'} still private
                </p>
              )}
              {entry.inLockbin ? (
                <p className="type-meta mt-3 text-vanilla">In the Lockbin</p>
              ) : (
                hasWriting && (
                  <button type="button" onClick={moveToLockbin} className="type-meta mt-3 block text-mango hover:text-vanilla">
                    Move to Lockbin
                  </button>
                )
              )}
              {!entry.inLockbin && entry.visibility === 'public' && publicMoments > 0 && settings.handle && (
                <a href={`#/d/${settings.handle}/${date}`} className="type-meta mt-3 block text-mango hover:text-vanilla">
                  See it as visitors do →
                </a>
              )}
            </div>

            <MoodPicker value={entry.mood} onChange={(mood) => update({ mood })} />
          </motion.div>
        </aside>

        {/* ── Writing surface ──────────────────────────────────── */}
        <motion.section
          aria-label="Moments"
          className="px-5 pb-40 pt-10 md:pl-4 md:pr-12 md:pt-[8.5rem]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.14, ease: EASE }}
        >
          <div ref={canvasWrap} className="max-w-[56rem]">
          <StickerCanvas items={canvas} onChange={setCanvas} selectedId={selectedSticker} onSelect={setSelectedSticker}>
          <ol className="max-w-[42.5rem]">
            {moments.map((m, i) => {
              const eff = effectiveVisibility(entry, m)
              return (
                <li key={m.id} className={i > 0 ? 'rule-hairline mt-14 pt-14' : ''}>
                  <Moment
                    moment={m}
                    heldBy={eff !== m.visibility ? entry.visibility : null}
                    autoFocus={m.id === focusId || (firstEmpty && isToday)}
                    placeholder={
                      i === 0
                        ? isToday
                          ? 'Start with one sentence about today.'
                          : 'Start with one sentence about that day.'
                        : 'And then…'
                    }
                    onChange={(patch) => updateMoment(m.id, patch)}
                    onRemove={moments.length > 1 || m.body ? () => removeMoment(m.id) : null}
                  />
                </li>
              )
            })}
          </ol>

          {/* ── Photos & video: may break out past the writing column ── */}
          <section aria-label="Photos and video" className="rule-hairline mt-14 max-w-[56rem] pt-6">
            <div className="flex max-w-[42.5rem] flex-wrap items-center gap-x-6 gap-y-2">
              <AddMediaButton onFiles={upload.add} disabled={Boolean(upload.progress)} />
              <button type="button" onClick={() => setTrayOpen(true)} className="type-meta py-1 text-mango hover:text-vanilla">
                + Stickers & GIFs
              </button>
              {media.length > 0 ? (
                <>
                  <span className="type-meta text-vanilla/50">{mediaSummary(media)}</span>
                  <span className="ml-auto">
                    <LayoutToggle value={entry.mediaLayout ?? 'grid'} onChange={(mediaLayout) => update({ mediaLayout })} />
                  </span>
                </>
              ) : (
                <span className="type-meta text-vanilla/40">or drop photos anywhere on this day</span>
              )}
            </div>

            <UploadStatus progress={upload.progress} errors={upload.errors} onDismiss={upload.dismissErrors} />

            {media.length > 0 && (
              <div className="mt-6">
                <MediaGallery
                  items={media}
                  layout={entry.mediaLayout ?? 'grid'}
                  editable
                  onCaption={captionMedia}
                  onRemove={removeMedia}
                  meta={`${headline(date).dayMonth} ${headline(date).year}`}
                />
              </div>
            )}
          </section>
          </StickerCanvas>
          </div>

          {!firstEmpty && (
            <button
              type="button"
              onClick={addMoment}
              className="type-meta rule-hairline mt-14 block w-full max-w-[42.5rem] pt-6 text-left text-mango hover:text-vanilla"
            >
              + Another moment · {formatTime(nowTime())} {TZ_LABEL}
            </button>
          )}
        </motion.section>
      </div>

      <SaveIndicator status={status} />
      <StickerTray
        open={trayOpen}
        onClose={() => setTrayOpen(false)}
        onPick={placePick}
      />
    </main>
  )
}

function DayNav({ date, today, isToday, onDateChange }) {
  return (
    <div className="type-meta flex flex-wrap items-center gap-x-5 gap-y-2">
      <button type="button" onClick={() => onDateChange(shiftDateKey(date, -1))} className="py-1 text-mango hover:text-vanilla">
        ← Prev
      </button>
      {isToday ? (
        <span className="py-1 text-vanilla/50">Today</span>
      ) : (
        <button type="button" onClick={() => onDateChange(today)} className="py-1 text-mango hover:text-vanilla">
          Today
        </button>
      )}
      <button
        type="button"
        disabled={isToday}
        onClick={() => onDateChange(shiftDateKey(date, 1))}
        className="py-1 text-mango hover:text-vanilla disabled:text-vanilla/25"
      >
        Next →
      </button>
      <label className="flex items-center gap-2 py-1 text-vanilla/60">
        <span>Go to</span>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="type-meta w-[3.2em] cursor-pointer bg-transparent text-transparent [color-scheme:dark] focus:outline-none focus-visible:outline-2 focus-visible:outline-mango"
          aria-label="Go to a date"
        />
      </label>
    </div>
  )
}
