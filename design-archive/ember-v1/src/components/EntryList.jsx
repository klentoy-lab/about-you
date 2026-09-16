import MediaGallery from './MediaGallery.jsx'
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

/**
 * Month-grouped list. The month marker sticks on the left edge while its entries scroll.
 * `renderEntry` decides how much of each entry to show.
 */
export function MonthGroups({ entries, renderEntry }) {
  return groupByMonth(entries).map((g) => (
    <section key={g.month} aria-label={monthLabel(g.month)} className="md:grid md:grid-cols-[150px_minmax(0,1fr)]">
      <div className="rule-hairline md:border-t-0">
        <h2 className="type-meta sticky top-[56px] z-10 bg-espresso py-4 text-vanilla md:bg-transparent md:pt-12">
          {monthLabel(g.month)}
          <span className="block text-vanilla/50">
            {g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </h2>
      </div>
      <ol>
        {g.entries.map((e) => (
          <li key={e.id} className="rule-hairline">
            {renderEntry(e)}
          </li>
        ))}
      </ol>
    </section>
  ))
}

function DateMark({ date, href, size = 'text-[40px]' }) {
  const { weekday, dayMonth, year } = headline(date)
  const inner = (
    <>
      <span className={`type-display block ${size} text-vanilla`}>{dayMonth}</span>
      <span className="type-meta mt-2 block text-vanilla/60">
        {weekday} · {year}
      </span>
    </>
  )
  return href ? (
    <a href={href} className="group block w-fit [&:hover_.type-display]:text-mango">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  )
}

/** Full entry: every moment with its time. Sealed entries show only date, mood and an ink block. */
export function EntryFull({ entry, href, sealed = false, unlockHref, showVisibility = false }) {
  return (
    <article className="relative py-12 pl-6 md:pl-8">
      <MoodSpine mood={entry.mood} className="absolute inset-y-0 left-0 w-[6px]" />
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <DateMark date={entry.date} href={href} />

        {sealed ? (
          <div className="max-w-[42.5rem]">
            <div className="h-24 w-full bg-ink" />
            <p className="type-meta mt-3 flex flex-wrap gap-x-5 text-vanilla">
              <span>In the Lockbin</span>
              {unlockHref && (
                <a href={unlockHref} className="text-mango hover:text-vanilla">
                  Unlock
                </a>
              )}
            </p>
          </div>
        ) : (
          <div className="min-w-0 space-y-8">
            {sortedMoments(entry).map((m) =>
              m.body.trim() ? (
                <div key={m.id} className="max-w-[42.5rem]">
                  <p className="type-meta flex gap-4 text-vanilla/60">
                    <span>{formatTime(m.time)}</span>
                    {showVisibility && <span>{m.visibility}</span>}
                  </p>
                  <p className="type-body mt-2 whitespace-pre-line">{m.body}</p>
                </div>
              ) : null,
            )}
            {entry.media?.length > 0 && (
              <div className="max-w-[52rem]">
                <MediaGallery items={entry.media} layout={entry.mediaLayout} meta={shortDate(entry.date)} />
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

/** One-line row for long public diaries: date, first moment, and the span of times. */
export function EntryLine({ entry, href }) {
  const ms = sortedMoments(entry)
  const first = ms[0]
  return (
    <a href={href} className="group relative block py-8 pl-6 md:pl-8">
      <MoodSpine mood={entry.mood} className="absolute inset-y-3 left-0 w-[6px]" />
      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <DateMark date={entry.date} size="text-[32px] group-hover:text-mango" />
        <div className="max-w-[42.5rem]">
          {first && <p className="type-body line-clamp-2">{first.body}</p>}
          <p className="type-meta mt-3 text-vanilla/55">
            {first && (
              <>
                {ms.length} {ms.length === 1 ? 'moment' : 'moments'} · {formatTime(first.time)}
                {ms.length > 1 && ` – ${formatTime(ms.at(-1).time)}`}
              </>
            )}
            {first && entry.media?.length > 0 && ' · '}
            {mediaSummary(entry.media)}
            <span className="ml-4 text-mango opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">Read →</span>
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
      className={`fixed bottom-0 left-0 top-[56px] z-0 hidden w-[76px] items-center justify-center overflow-hidden bg-espresso transition-opacity duration-300 md:flex ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <p className="whitespace-nowrap text-vanilla [transform:rotate(180deg)] [writing-mode:vertical-rl]">
        <span className="type-meta mr-4">To</span>
        <span className="type-display text-[56px]">{name}</span>
      </p>
    </div>
  )
}
