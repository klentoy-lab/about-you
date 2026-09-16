import { useMemo } from 'react'
import { fromDateKey, monthLabel, toDateKey } from '../lib/date.js'
import { moodGradient } from '../lib/moods.js'
import { listEntries } from '../lib/store.js'
import { useStoreVersion } from '../lib/useStore.js'

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (n) => String(n).padStart(2, '0')

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

/** Month grid. Days with an entry fill with that day's mood; empty days stay hollow. */
export default function Calendar({ month }) {
  const v = useStoreVersion()
  const today = toDateKey()
  const thisMonth = today.slice(0, 7)
  const ym = /^\d{4}-\d{2}$/.test(month ?? '') ? month : thisMonth

  const byDate = useMemo(() => Object.fromEntries(listEntries().map((e) => [e.date, e])), [v])

  const [y, m] = ym.split('-').map(Number)
  const lead = fromDateKey(`${ym}-01`).getUTCDay()
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${pad(i + 1)}`)]
  const written = cells.filter((d) => d && byDate[d]).length
  const [name, year] = monthLabel(ym).split(' ')

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <nav aria-label="Months" className="type-meta flex gap-6">
        <a href={`#/calendar/${shiftMonth(ym, -1)}`} className="text-mango hover:text-vanilla">
          ← Prev
        </a>
        {ym !== thisMonth && (
          <a href="#/calendar" className="text-mango hover:text-vanilla">
            This month
          </a>
        )}
        {ym < thisMonth && (
          <a href={`#/calendar/${shiftMonth(ym, 1)}`} className="text-mango hover:text-vanilla">
            Next →
          </a>
        )}
      </nav>

      <h1 className="mt-8 flex items-start gap-3">
        <span className="type-display text-[clamp(48px,8vw,120px)] text-vanilla">{name}</span>
        <span className="type-meta mt-[0.6em] text-vanilla/60">{year}</span>
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="type-meta text-vanilla/60">
          {written} of {days} days written
        </p>
        {written > 0 && (
          <a href={`#/print/month/${ym}`} className="chip">
            Export month as PDF
          </a>
        )}
      </div>

      <div className="mt-10 grid max-w-[980px] grid-cols-7 gap-1.5 md:gap-2" role="grid" aria-label={monthLabel(ym)}>
        {WEEK.map((w) => (
          <div key={w} role="columnheader" className="type-meta pb-2 text-vanilla/50">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`lead-${i}`} aria-hidden />
          const entry = byDate[d]
          const mood = entry?.mood ?? null
          const future = d > today
          const isToday = d === today
          const dayNum = Number(d.slice(8))
          const label = `${dayNum} ${name}${entry ? (entry.inLockbin ? ', in the Lockbin' : mood ? `, written, mood 0${mood}` : ', written') : ''}${isToday ? ', today' : ''}`

          const base = 'relative block aspect-square min-h-[44px] overflow-hidden rounded-[8px] md:aspect-[4/3] md:rounded-[12px]'
          // Transparent cells: the page shows through, and a written day is marked by its mood alone.
          const state = future
            ? 'border border-vanilla/10 opacity-40'
            : entry
              ? 'border border-vanilla/20 transition-transform duration-700 ease-soft hover:-translate-y-0.5'
              : 'border border-vanilla/10 transition-colors duration-500 hover:border-mango/60'
          const ring = isToday ? 'outline outline-2 outline-offset-2 outline-mango' : ''

          const inner = (
            <>
              {entry && mood && (
                <>
                  {/* the day's own theme: its surface, glows and accent */}
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-70"
                    style={{
                      background:
                        'radial-gradient(120% 100% at 100% 100%, var(--glow-wine), transparent 75%), radial-gradient(90% 80% at 0% 0%, var(--glow-amber), transparent 75%)',
                    }}
                  />
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1 md:w-1.5" style={{ background: moodGradient(mood) }} />
                </>
              )}
              <span
                className={`type-meta absolute left-2 top-1.5 tracking-[0.12em] md:left-3 md:top-2.5 md:text-[13px] ${
                  entry ? (mood ? 'text-mango' : 'text-vanilla/80') : isToday ? 'text-mango' : 'text-vanilla/55'
                }`}
              >
                {dayNum}
              </span>
              {entry?.inLockbin && (
                <span aria-hidden className="absolute bottom-1.5 right-1.5 h-2 w-2 border border-vanilla/40 bg-ink md:bottom-2.5 md:right-2.5 md:h-2.5 md:w-2.5" title="In the Lockbin" />
              )}
              {entry && !entry.inLockbin && (entry.track || entry.media?.length > 0) && (
                <span aria-hidden className="absolute bottom-1.5 right-2 hidden gap-1 md:bottom-2.5 md:right-3 md:flex">
                  {entry.media?.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-vanilla/70" />}
                  {entry.track && <span className="h-1.5 w-1.5 rounded-full bg-mango" />}
                </span>
              )}
            </>
          )

          return future ? (
            <div key={d} role="gridcell" aria-label={label} className={`${base} ${state}`}>
              {inner}
            </div>
          ) : (
            <a
              key={d}
              role="gridcell"
              aria-label={label}
              href={isToday ? '#/' : `#/today/${d}`}
              data-mood-scope={mood ?? undefined}
              className={`${base} ${state} ${ring} focus-visible:outline-mango`}
            >
              {inner}
            </a>
          )
        })}
      </div>

      {/* Legend: each mood shown in its own theme */}
      <div className="mt-8 flex max-w-[980px] flex-wrap items-center gap-x-5 gap-y-3">
        {[1, 2, 3, 4, 5].map((m) => (
          <span key={m} data-mood-scope={m} className="type-meta flex items-center gap-2 text-vanilla/60">
            <span className="relative h-5 w-7 overflow-hidden rounded-[5px] border border-vanilla/20">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: moodGradient(m) }} />
              <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 100% at 100% 100%, var(--glow-wine), transparent 70%)' }} />
            </span>
            <span className="text-mango">0{m}</span>
          </span>
        ))}
        <span className="type-meta flex items-center gap-4 text-vanilla/45 md:ml-auto">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-vanilla/70" /> Photos</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-mango" /> Song</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 border border-vanilla/40 bg-ink" /> Lockbin</span>
        </span>
      </div>
    </main>
  )
}
