import { useState } from 'react'
import MediaGallery from './MediaGallery.jsx'
import { SongLine } from './SongCard.jsx'
import MoodSpine from './MoodSpine.jsx'
import { formatTime, headline, monthLabel, shortDate } from '../lib/date.js'

export function mediaSummary(media = []) {
  const photos = media.filter((m) => m.kind === 'photo').length
  const videos = media.length - photos
  return [photos && `${photos} ${photos === 1 ? 'photo' : 'photos'}`, videos && `${videos} ${videos === 1 ? 'video' : 'videos'}`]
    .filter(Boolean)
    .join(' · ')
}

export function groupByMonth(entries) {
  const groups = []
  for (const e of entries) {
    const month = e.date.slice(0, 7)
    const last = groups.at(-1)
    if (last?.month === month) last.entries.push(e)
    else groups.push({ month, entries: [e] })
  }
  return groups
}

const sortedMoments = (e) => [...e.moments].sort((a, b) => a.time.localeCompare(b.time))

/** The day's own theme behind an entry: its glows over its raised surface (see data-mood-scope in index.css). */
const THEME_GLOW =
  'radial-gradient(90% 70% at 0% 0%, var(--glow-amber), transparent 70%), radial-gradient(90% 80% at 100% 100%, var(--glow-wine), transparent 70%)'

/**
 * Month-grouped list. The month marker sticks on the left edge while its entries scroll.
 * `renderEntry` decides how much of each entry to show.
 */
export function MonthGroups({ entries, renderEntry, monthAction }) {
  return groupByMonth(entries).map((g) => (
    <section key={g.month} aria-label={monthLabel(g.month)} className="md:grid md:grid-cols-[150px_minmax(0,1fr)]">
      {/* Phone: a floating frosted pill that sticks under the nav. Desktop: a quiet label in the left column. */}
      <div className="pb-4 pt-8 md:pb-0 md:pt-0">
        <h2 className="type-meta sticky top-17 z-10 text-vanilla md:top-14 md:pt-12">
          <span className="inline-flex items-center gap-3 rounded-full border border-vanilla/10 bg-ink/60 px-4 py-2 backdrop-blur-md md:block md:rounded-none md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            {monthLabel(g.month)}
            <span className="text-vanilla/50 md:block">
              {g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </span>
          {monthAction && <span className="ml-3 inline-block md:ml-0 md:mt-4 md:block">{monthAction(g.month)}</span>}
        </h2>
      </div>
      <ol className="space-y-4 md:space-y-5 md:pt-10">
        {g.entries.map((e) => (
          <li key={e.id}>{renderEntry(e)}</li>
        ))}
      </ol>
    </section>
  ))
}

function DateMark({ date, href, size = 'text-[40px]' }) {
  const { weekday, dayMonth, year } = headline(date)
  const inner = (
    <>
      <span className={`type-display block ${size} text-vanilla transition-colors duration-500`}>{dayMonth}</span>
      <span className="mt-1 block">
        <span className="type-serif text-[20px] text-vanilla/75">{weekday[0] + weekday.slice(1).toLowerCase()}</span>
        <span className="type-meta ml-2 text-vanilla/45">{year}</span>
      </span>
    </>
  )
  return href ? (
    <a href={href} className="group/date block w-fit [&:hover_.type-display]:text-mango">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  )
}

/**
 * Full entry as a soft panel in its own mood theme: surface, glows, accent and the gradient spine.
 * Sealed entries keep the theme and date but show only an ink block.
 */
export function EntryFull({ entry, href, sealed = false, unlockHref, showVisibility = false, onDelete }) {
  const mood = entry.mood ?? null
  return (
    <article
      data-mood-scope={mood ?? undefined}
      className="relative overflow-hidden rounded-[18px] border border-vanilla/10 py-9 pl-7 pr-5 md:py-10 md:pl-10 md:pr-8"
    >
      {mood && <span aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ background: THEME_GLOW }} />}
      <MoodSpine mood={mood} className="absolute inset-y-0 left-0 w-1.5" />

      <div className="relative grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <div>
          <DateMark date={entry.date} href={href} />
          {(href || onDelete) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {href && (
                <a href={href} className="chip min-h-8 px-3">
                  Edit
                </a>
              )}
              {onDelete && <DeleteEntryButton date={entry.date} onDelete={onDelete} />}
            </div>
          )}
        </div>

        {sealed ? (
          <div className="max-w-170">
            <div className="h-24 w-full rounded-[10px] bg-ink" />
            <p className="type-meta mt-3 flex flex-wrap gap-x-5 text-vanilla">
              <span>In the Lockbin</span>
              {unlockHref && (
                <a href={unlockHref} className="text-mango transition-colors duration-500 hover:text-vanilla">
                  Unlock
                </a>
              )}
            </p>
          </div>
        ) : (
          <div className="min-w-0 space-y-8">
            {entry.track && <SongLine track={entry.track} className="max-w-170" />}
            {sortedMoments(entry).map((m) =>
              m.body.trim() ? (
                <div key={m.id} className="max-w-170">
                  <p className="type-meta flex gap-4">
                    <span className="text-mango">{formatTime(m.time)}</span>
                    {showVisibility && <span className="text-vanilla/50">{m.visibility}</span>}
                  </p>
                  <p className="type-body mt-2 whitespace-pre-line">{m.body}</p>
                </div>
              ) : null,
            )}
            {entry.media?.length > 0 && (
              <div className="max-w-208">
                <MediaGallery items={entry.media} layout={entry.mediaLayout} meta={shortDate(entry.date)} />
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

/** Deleting a day asks once, on the button itself. */
function DeleteEntryButton({ date, onDelete }) {
  const [armed, setArmed] = useState(false)
  return (
    <button
      type="button"
      onClick={() => (armed ? onDelete(date) : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={`chip min-h-8 px-3 ${armed ? 'chip-solid' : ''}`}
    >
      {armed ? 'Delete — sure?' : 'Delete'}
    </button>
  )
}

/** One row for long public diaries, in the day's mood theme: date, first moment, and the span of times. */
export function EntryLine({ entry, href, kicker }) {
  const ms = sortedMoments(entry)
  const first = ms[0]
  const mood = entry.mood ?? null
  return (
    <a
      href={href}
      data-mood-scope={mood ?? undefined}
      className="group relative block overflow-hidden rounded-2xl border border-vanilla/10 py-7 pl-8 pr-5 transition-colors duration-700 ease-soft hover:border-vanilla/25 md:pl-10 md:pr-8"
    >
      {mood && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-1000 ease-soft group-hover:opacity-70"
          style={{ background: THEME_GLOW }}
        />
      )}
      <MoodSpine mood={mood} className="absolute inset-y-0 left-0 w-1.5" />

      {kicker && <div className="relative mb-4">{kicker}</div>}
      <div className="relative grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <DateMark date={entry.date} size="text-[32px] group-hover:text-mango" />
        <div className="max-w-170">
          {first && <p className="type-serif line-clamp-2 text-[26px] leading-[1.2] text-vanilla/90">{first.body}</p>}
          {entry.track && <SongLine track={entry.track} className="mt-3" />}
          <p className="type-meta mt-3 text-vanilla/55">
            {first && (
              <>
                {ms.length} {ms.length === 1 ? 'moment' : 'moments'} ·{' '}
                <span className="text-mango">
                  {formatTime(first.time)}
                  {ms.length > 1 && ` – ${formatTime(ms.at(-1).time)}`}
                </span>
              </>
            )}
            {first && entry.media?.length > 0 && ' · '}
            {mediaSummary(entry.media)}
            <span className="ml-4 text-mango opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100">
              Read →
            </span>
          </p>
        </div>
      </div>
    </a>
  )
}

/** Dedication running bottom-to-top down the left gutter, fixed while entries scroll. */
export function DedicationGutter({ name, visible = true }) {
  if (!name) return null
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed bottom-0 left-0 top-14 z-0 hidden w-19 items-center justify-center overflow-hidden transition-opacity duration-1000 ease-soft md:flex ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="whitespace-nowrap text-vanilla transform-[rotate(180deg)] [writing-mode:vertical-rl]">
        <span className="type-meta mr-4">To</span>
        <span className="type-display text-[56px]">{name}</span>
      </p>
    </div>
  )
}
