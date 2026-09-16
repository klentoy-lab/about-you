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
      <p className="type-meta mt-4 text-vanilla/60">
        {written} of {days} days written
      </p>

      <div className="mt-10 grid max-w-[980px] grid-cols-7 gap-1.5 md:gap-2" role="grid" aria-label={monthLabel(ym)}>
        {WEEK.map((w) => (
          <div key={w} role="columnheader" className="type-meta pb-2 text-vanilla/50">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`lead-${i}`} aria-hidden />
          const entry = byDate[d]
          const future = d > today
          const bg = entry ? moodGradient(entry.mood) : null
          const dayNum = Number(d.slice(8))
          const label = `${dayNum} ${name}${entry ? (entry.inLockbin ? ', in the Lockbin' : ', written') : ''}`
          const cls = `relative block aspect-square min-h-[44px] md:aspect-[4/3] ${
            entry && !bg ? 'bg-vanilla/15' : ''
          } ${!entry ? 'border border-vanilla/12' : ''} ${future ? 'opacity-40' : 'hover:outline hover:outline-2 hover:outline-mango'}`
          const num = (
            <span
              className={`type-meta absolute left-1 top-1 px-1 py-0.5 md:left-1.5 md:top-1.5 ${
                entry ? 'bg-ink text-vanilla' : d === today ? 'text-mango' : 'text-vanilla/60'
              }`}
            >
              {dayNum}
            </span>
          )
          return future ? (
            <div key={d} role="gridcell" aria-label={label} className={cls}>
              {num}
            </div>
          ) : (
            <a
              key={d}
              role="gridcell"
              aria-label={label}
              href={d === today ? '#/' : `#/today/${d}`}
              className={cls}
              style={bg ? { background: bg } : undefined}
            >
              {num}
              {d === today && <span aria-hidden className="absolute bottom-1 right-1 h-[2px] w-4 bg-mango" />}
            </a>
          )
        })}
      </div>
    </main>
  )
}
