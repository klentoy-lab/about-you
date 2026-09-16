import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import MediaGallery from '../components/MediaGallery.jsx'
import SongCard, { MusicAttach } from '../components/SongCard.jsx'
import { moodGlow } from '../lib/moods.js'
import { useMoodTheme } from '../lib/theme.js'
import { DUR, SOFT } from '../lib/motion.js'
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
import { effectiveVisibility, getEntry, getSettings, newMoment, saveEntry } from '../lib/store.js'
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

const EASE = SOFT

function DateHeadline({ date }) {
  const { weekday, dayMonth, year } = headline(date)
  return (
    <h1 className="mt-8 md:mt-10" aria-label={`${weekday} ${dayMonth} ${year}`}>
      <motion.span
        className="type-serif block text-[clamp(40px,3.8vw,58px)] text-vanilla/90"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE }}
      >
        {weekday[0] + weekday.slice(1).toLowerCase()}
      </motion.span>
      <motion.span
        className="flex flex-wrap items-start gap-x-3 gap-y-1"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, delay: 0.12, ease: EASE }}
      >
        <span className="type-display whitespace-nowrap text-[clamp(44px,4.6vw,74px)] text-vanilla">{dayMonth}</span>
        <span className="type-meta mt-[0.4em] text-vanilla/60">{year}</span>
      </motion.span>
    </h1>
  )
}

function SealedDay({ date, onDateChange }) {
  const today = toDateKey()
  const entry = getEntry(date)
  useMoodTheme(entry.mood)
  return (
    <main className="relative min-h-[calc(100svh-56px)]">
      <MoodSpine mood={entry.mood} className="absolute inset-y-0 left-0 hidden w-1.5 md:block" />
      <div className="md:grid md:grid-cols-[clamp(300px,32vw,460px)_minmax(0,1fr)]">
        <aside className="px-5 pt-8 md:pl-12 md:pr-8 md:pt-14">
          <DayNav date={date} today={today} isToday={date === today} onDateChange={onDateChange} />
          <DateHeadline date={date} />
          <MoodSpine mood={entry.mood} horizontal className="mt-5 h-1 w-full md:hidden" />
        </aside>
        <section className="px-5 pb-40 pt-10 md:pl-4 md:pr-12 md:pt-34">
          <div className="h-40 w-full max-w-170 bg-ink" />
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
  useMoodTheme(entry.mood) // picking a mood re-themes the app straight away
  const settings = getSettings()

  const today = toDateKey()
  const isToday = date === today

  const moments = useMemo(
    () => [...entry.moments].sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt)),
    [entry.moments],
  )
  const privateCount = entry.moments.filter((m) => m.visibility === 'private').length
  const hasWriting = entry.moments.some((m) => m.body.trim()) || entry.media?.length > 0
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

  const [addingSong, setAddingSong] = useState(false)

  // Saved at once, not on the debounce: leaving public surfaces must be immediate.
  const moveToLockbin = () => {
    const next = { ...entry, inLockbin: true }
    saveEntry(next)
    setEntry(next)
  }

  const firstEmpty = moments.length === 1 && !moments[0].body

  return (
    <main ref={mainRef} className="relative min-h-[calc(100svh-56px)]">
      {/* v2: the day's mood tints the top of the page */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-40 left-[-10%] h-[70vmin] w-[70vmin] rounded-full blur-[110px] transition-[opacity,background-color] duration-500 ${entry.mood ? 'opacity-35' : 'opacity-0'}`}
        style={{ backgroundColor: moodGlow(entry.mood) }}
      />
      {/* Desktop spine: runs the full height of the entry on its left edge */}
      <MoodSpine mood={entry.mood} className="absolute inset-y-0 left-0 hidden w-1.5 md:block" />
      <DropSheet show={dragging} />

      <div className="md:grid md:grid-cols-[clamp(300px,32vw,460px)_minmax(0,1fr)]">
        {/* ── Gutter: date, entry controls ─────────────────────── */}
        <aside className="px-5 pt-8 md:sticky md:top-14 md:h-[calc(100svh-56px)] md:overflow-y-auto md:pb-10 md:pl-12 md:pr-8 md:pt-14">
          <DayNav date={date} today={today} isToday={isToday} onDateChange={onDateChange} />
          <DateHeadline date={date} />

          {/* Mobile spine: a thin bar under the date */}
          <MoodSpine mood={entry.mood} horizontal className="mt-5 h-1 w-full md:hidden" />

          <motion.div
            className="mt-8 flex flex-wrap items-start gap-x-10 gap-y-8 md:mt-12 md:block md:space-y-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DUR.slow, delay: 0.35, ease: EASE }}
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
              {hasWriting && (
                <a href={`#/print/entry/${date}`} className="chip mt-5">
                  Export PDF
                </a>
              )}
            </div>

            <MoodPicker value={entry.mood} onChange={(mood) => update({ mood })} />
          </motion.div>
        </aside>

        {/* ── Writing surface ──────────────────────────────────── */}
        <motion.section
          aria-label="Moments"
          className="px-5 pb-40 pt-10 md:pl-4 md:pr-12 md:pt-34"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.slow, delay: 0.25, ease: EASE }}
        >
          {/* ── Song of the day ── */}
          {entry.track ? (
            <div className="mb-14">
              <SongCard
                track={entry.track}
                onChange={(patch) => setEntry((e) => ({ ...e, track: { ...e.track, ...patch } }))}
                onRemove={() => update({ track: null })}
              />
            </div>
          ) : (
            addingSong && (
              <div className="mb-14">
                <MusicAttach
                  onAttach={(track) => {
                    update({ track })
                    setAddingSong(false)
                  }}
                  onCancel={() => setAddingSong(false)}
                />
              </div>
            )
          )}

          <div className="max-w-4xl">
          <ol className="max-w-170">
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
          {media.length > 0 && (
            <section aria-label="Photos and video" className="rule-hairline mt-14 pt-6">
              <div className="flex min-h-9 max-w-170 items-center gap-4">
                <span className="type-meta text-vanilla/50">{mediaSummary(media)}</span>
                <span className="ml-auto">
                  <LayoutToggle value={entry.mediaLayout ?? 'grid'} onChange={(mediaLayout) => update({ mediaLayout })} />
                </span>
              </div>
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
            </section>
          )}
          </div>

          {/* ── Add to this day ── */}
          <div className="rule-hairline mt-14 max-w-170 pt-6">
            <p className="type-meta mb-4 text-vanilla/45">Add to this day</p>
            <div className="flex flex-wrap items-center gap-3">
              {!firstEmpty && (
                <button type="button" onClick={addMoment} className="chip chip-solid">
                  + Moment · {formatTime(nowTime())} {TZ_LABEL}
                </button>
              )}
              <AddMediaButton onFiles={upload.add} disabled={Boolean(upload.progress)} />
              {!entry.track && !addingSong && (
                <button type="button" onClick={() => setAddingSong(true)} className="chip">
                  ♪ Song of the day
                </button>
              )}
            </div>
            <p className="type-meta mt-3 text-vanilla/35">or drop photos anywhere on this day</p>
            <UploadStatus progress={upload.progress} errors={upload.errors} onDismiss={upload.dismissErrors} />
          </div>
        </motion.section>
      </div>

      <SaveIndicator status={status} />
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
          className="type-meta w-[3.2em] cursor-pointer bg-transparent text-transparent scheme-dark focus:outline-none focus-visible:outline-2 focus-visible:outline-mango"
          aria-label="Go to a date"
        />
      </label>
    </div>
  )
}
