import { useMemo, useState } from 'react'
import MoodSpine from '../components/MoodSpine.jsx'
import { formatTime, headline, monthLabel } from '../lib/date.js'
import { MOODS } from '../lib/moods.js'
import { getEntry, listEntries } from '../lib/store.js'
import { toDateKey } from '../lib/date.js'
import { useMoodTheme } from '../lib/theme.js'
import { useLockbin } from '../lib/lockbin.js'
import { useStoreVersion } from '../lib/useStore.js'

function Highlight({ text, query }) {
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return text
  const start = Math.max(0, i - 80)
  return (
    <>
      {start > 0 && '…'}
      {text.slice(start, i)}
      <mark className="bg-mango text-ink">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

/** Full-text search across your own entries. Lockbin entries are searched only while it's open. */
export default function Search() {
  const v = useStoreVersion()
  const unlocked = useLockbin()
  const [q, setQ] = useState('')
  const [month, setMonth] = useState('')
  const [mood, setMood] = useState(null)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)
  const [hasMusic, setHasMusic] = useState(false)

  // Filtering by a mood wears that mood; with no mood filter, the page keeps today's.
  useMoodTheme(mood ?? getEntry(toDateKey()).mood)

  const all = useMemo(() => listEntries(), [v])
  const months = useMemo(() => [...new Set(all.map((e) => e.date.slice(0, 7)))], [all])
  const sealedCount = unlocked ? 0 : all.filter((e) => e.inLockbin).length

  const query = q.trim()
  const results = useMemo(
    () =>
      all
        .filter((e) => unlocked || !e.inLockbin)
        .filter((e) => !month || e.date.startsWith(month))
        .filter((e) => !mood || e.mood === mood)
        .filter((e) => !hasPhoto || e.media.some((m) => m.kind === 'photo'))
        .filter((e) => !hasVideo || e.media.some((m) => m.kind === 'video'))
        .filter((e) => !hasMusic || e.track)
        .flatMap((e) =>
          e.moments
            .filter((m) => m.body.trim() && (!query || m.body.toLowerCase().includes(query.toLowerCase())))
            .map((m) => ({ entry: e, moment: m })),
        ),
    [all, unlocked, month, mood, hasPhoto, hasVideo, hasMusic, query],
  )
  const filtering = query || month || mood || hasPhoto || hasVideo || hasMusic

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <h1 className="type-display text-[clamp(48px,8vw,120px)] text-vanilla">Search</h1>

      <label className="mt-10 block max-w-170">
        <span className="sr-only">Search your entries</span>
        <input
          type="search"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="A word you remember writing"
          className="type-body w-full max-w-none border-b border-vanilla/30 bg-transparent pb-3 text-[24px] placeholder:text-vanilla/35 focus:border-mango focus:outline-none focus-visible:outline-none"
        />
      </label>

      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-6">
        <label className="type-meta flex flex-col gap-2 text-vanilla/60">
          Month
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="type-meta bg-espresso py-1 text-mango focus:outline-none"
          >
            <option value="">Any month</option>
            {months.map((mo) => (
              <option key={mo} value={mo}>
                {monthLabel(mo)}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="type-meta mb-2 text-vanilla/60">Mood</p>
          <div className="flex items-end gap-2" role="radiogroup" aria-label="Filter by mood">
            {MOODS.map((mo) => (
              <button
                key={mo.id}
                type="button"
                role="radio"
                aria-checked={mood === mo.id}
                aria-label={mo.label}
                onClick={() => setMood(mood === mo.id ? null : mo.id)}
                className={`block w-6 ${mood === mo.id ? 'h-10 outline outline-2 outline-offset-2 outline-mango' : 'h-7'}`}
                style={{ background: mo.gradient }}
              />
            ))}
          </div>
        </div>

        <div className="type-meta flex gap-6">
          {[
            ['Has photos', hasPhoto, setHasPhoto],
            ['Has video', hasVideo, setHasVideo],
            ['Has music', hasMusic, setHasMusic],
          ].map(([label, on, set]) => (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => set(!on)}
              className={`flex items-center gap-2 py-1 ${on ? 'text-vanilla' : 'text-mango hover:text-vanilla'}`}
            >
              <span aria-hidden className={`inline-block h-1.75 w-1.75 border border-current ${on ? 'bg-mango border-mango' : ''}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="type-meta mt-10 text-vanilla/60">
        {filtering ? `${results.length} ${results.length === 1 ? 'moment' : 'moments'} found` : `${results.length} moments in your diary`}
        {sealedCount > 0 && ` · ${sealedCount} in the Lockbin not searched`}
      </p>

      <ol className="mt-6 max-w-4xl">
        {results.slice(0, 200).map(({ entry, moment }) => {
          const { weekday, dayMonth, year } = headline(entry.date)
          return (
            <li key={moment.id} className="rule-hairline">
              <a href={`#/today/${entry.date}`} className="group relative block py-7 pl-6">
                <MoodSpine mood={entry.mood} className="absolute inset-y-4 left-0 w-1.5" />
                <p className="type-meta text-vanilla/60">
                  <span className="text-vanilla group-hover:text-mango">
                    {weekday} {dayMonth} {year}
                  </span>{' '}
                  · {formatTime(moment.time)}
                </p>
                <p className="type-body mt-2 line-clamp-3">
                  <Highlight text={moment.body} query={query} />
                </p>
              </a>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
