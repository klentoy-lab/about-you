import { useEffect, useMemo, useState } from 'react'
import MediaGallery from '../components/MediaGallery.jsx'
import MoodSpine from '../components/MoodSpine.jsx'
import SongCard from '../components/SongCard.jsx'
import Wordmark from '../components/Wordmark.jsx'
import { mediaSummary } from '../components/EntryList.jsx'
import { TZ_LABEL, formatTime, headline, monthLabel, shortDate, toDateKey } from '../lib/date.js'
import { useLockbin } from '../lib/lockbin.js'
import { dedicationOf, getSettings, listEntries } from '../lib/store.js'
import { applyMoodTheme } from '../lib/theme.js'
import { useStoreVersion } from '../lib/useStore.js'

const hasContent = (e) => e.moments.some((m) => m.body.trim()) || e.media?.length || e.canvas?.length || e.track || e.mood

/**
 * Printable pages for "Save as PDF": one entry, or a whole month (a cover, then one page per day).
 * Keeps the layout — song card, writing, and photos in the chosen grid or collage.
 * This is the owner's own export, so private moments are included; Lockbin days stay sealed unless it's open.
 */
export default function PrintView({ kind, param }) {
  const v = useStoreVersion()
  const unlocked = useLockbin()
  const [paper, setPaper] = useState('dark')
  const [preparing, setPreparing] = useState(false)
  // A4 is 210mm ≈ 794px, wider than a phone: shrink the preview to fit. Printing is never scaled.
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 20) / 794))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  const settings = getSettings()
  const dedication = dedicationOf(settings)

  const valid = kind === 'month' ? /^\d{4}-\d{2}$/.test(param ?? '') : /^\d{4}-\d{2}-\d{2}$/.test(param ?? '')
  const entries = useMemo(() => {
    if (!valid) return []
    const all = listEntries().filter(hasContent)
    return kind === 'month'
      ? all.filter((e) => e.date.startsWith(param)).sort((a, b) => a.date.localeCompare(b.date)) // reading order
      : all.filter((e) => e.date === param)
  }, [v, kind, param, valid])

  // "15 Sept 2026", "September 2026" — normal case reads better as a file name than the display caps.
  const nice = (s) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
  const title =
    kind === 'month'
      ? `About You — To ${dedication || 'you'} — ${nice(monthLabel(valid ? param : toDateKey()))}`
      : `About You — To ${dedication || 'you'} — ${valid ? nice(shortDate(param)) : ''}`

  // The document title becomes the PDF's default file name.
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  useEffect(() => {
    applyMoodTheme(null)
    document.documentElement.dataset.print = paper
    return () => {
      delete document.documentElement.dataset.print
    }
  }, [paper])

  const saveAsPdf = async () => {
    setPreparing(true)
    // Make sure every photo, GIF and artwork has loaded before the print window snapshots the page.
    const imgs = [...document.querySelectorAll('.print-page img')]
    imgs.forEach((img) => (img.loading = 'eager'))
    await Promise.all(imgs.map((img) => (img.complete ? null : img.decode().catch(() => null))))
    await new Promise((r) => setTimeout(r, 150))
    setPreparing(false)
    window.print()
  }

  const back = kind === 'month' ? `#/calendar/${param}` : param === toDateKey() ? '#/' : `#/today/${param}`

  return (
    <div className="min-h-svh pb-16">
      {/* toolbar — never printed */}
      <div className="sticky top-0 z-40 border-b border-vanilla/10 bg-ink/90 text-[#FFF1D6] backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3">
          <a href={back} className="chip border-[#FFF1D6]/25 text-[#FFF1D6]">
            ← Back
          </a>
          <p className="type-meta min-w-0 flex-1 truncate text-[#FFF1D6]/70">
            PDF · {kind === 'month' ? `${monthLabel(param ?? toDateKey())} · ${entries.length} ${entries.length === 1 ? 'day' : 'days'}` : param && shortDate(param)}
          </p>
          <div role="radiogroup" aria-label="Page colours" className="flex rounded-full border border-[#FFF1D6]/20 p-0.5">
            {[
              ['dark', 'Dark'],
              ['paper', 'Paper'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={paper === id}
                onClick={() => setPaper(id)}
                className={`type-meta min-h-8 rounded-full px-3 transition-colors duration-500 ${
                  paper === id ? 'bg-[#FFF1D6] text-[#100C08]' : 'text-[#FFF1D6]/70 hover:text-[#FFF1D6]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={saveAsPdf}
            disabled={!entries.length || preparing}
            className="chip border-[#FF9F1C] bg-[#FF9F1C] text-[#100C08] hover:border-[#FFF1D6] hover:bg-[#FFF1D6] hover:text-[#100C08]"
          >
            {preparing ? 'Preparing…' : 'Save as PDF'}
          </button>
        </div>
        <p className="mx-auto max-w-5xl px-5 pb-3 text-[13px] text-[#FFF1D6]/55">
          In the print window, choose <strong className="font-normal text-[#FFF1D6]">Save as PDF</strong> as the destination.
          Turn on “Background graphics” if the pages print without colour.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="mx-auto max-w-160 px-5 pt-20 text-center print:hidden">
          <p className="type-body mx-auto">{valid ? 'Nothing written here yet, so there’s nothing to export.' : 'That export link isn’t valid.'}</p>
          <a href={back} className="chip mt-8">
            ← Back
          </a>
        </div>
      ) : (
        <div className="print-scale mt-8 flex flex-col items-center gap-8 px-2 print:mt-0 print:gap-0 print:px-0" style={{ zoom: scale }}>
          {kind === 'month' && <MonthCover month={param} dedication={dedication} entries={entries} handle={settings.handle} />}
          {entries.map((e) => (
            <EntryPage
              key={e.id}
              entry={e}
              dedication={dedication}
              handle={settings.handle}
              sealed={e.inLockbin && !unlocked}
              themed={paper === 'dark'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PageFrame({ children, dedication, handle, mood, themed, label }) {
  return (
    <section
      className="print-page rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.35)] print:shadow-none"
      data-mood-scope={themed && mood ? mood : undefined}
      aria-label={label}
    >
      {themed && mood && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 45% at 0% 0%, var(--glow-amber), transparent 70%), radial-gradient(70% 50% at 100% 100%, var(--glow-wine), transparent 70%)',
          }}
        />
      )}
      <header className="type-meta relative mb-10 flex items-center justify-between gap-4 text-vanilla/60">
        <span className="text-[15px] text-vanilla">
          <Wordmark />
        </span>
        <span>{dedication ? `To ${dedication}` : ''}</span>
      </header>
      <div className="relative">{children}</div>
      <footer className="type-meta absolute inset-x-[16mm] bottom-[8mm] flex justify-between text-vanilla/40">
        <span>{handle ? `aboutyou/${handle}` : 'About You'}</span>
        <span>Times in {TZ_LABEL}</span>
      </footer>
    </section>
  )
}

function MonthCover({ month, dedication, entries, handle }) {
  const [name, year] = monthLabel(month).split(' ')
  const moments = entries.reduce((n, e) => n + e.moments.filter((m) => m.body.trim()).length, 0)
  const media = entries.flatMap((e) => e.media ?? [])
  const songs = entries.filter((e) => e.track).length
  return (
    <PageFrame dedication={dedication} handle={handle} label={`${monthLabel(month)} cover`}>
      <div className="flex min-h-[220mm] flex-col justify-end">
        <p className="type-meta text-vanilla">To</p>
        <p className="type-display mt-2 wrap-break-word text-[96px] leading-[0.86] tracking-[-0.04em] text-vanilla">{dedication || 'You'}</p>
        <p className="type-serif mt-8 text-[44px] text-vanilla/90">
          {name[0] + name.slice(1).toLowerCase()} {year}
        </p>
        <p className="type-meta mt-6 flex flex-wrap gap-x-5 gap-y-1 text-vanilla/60">
          <span>
            {entries.length} {entries.length === 1 ? 'day' : 'days'}
          </span>
          <span>
            {moments} {moments === 1 ? 'moment' : 'moments'}
          </span>
          {media.length > 0 && <span>{mediaSummary(media)}</span>}
          {songs > 0 && (
            <span>
              {songs} {songs === 1 ? 'song' : 'songs'}
            </span>
          )}
        </p>
        {/* the month's moods, in order */}
        <div className="mt-10 flex h-16 gap-1.5">
          {entries.map((e) => (
            <MoodSpine key={e.id} mood={e.mood} className="h-full flex-1 rounded-[3px]" />
          ))}
        </div>
      </div>
    </PageFrame>
  )
}

function EntryPage({ entry, dedication, handle, sealed, themed }) {
  const { weekday, dayMonth, year } = headline(entry.date)
  const moments = [...entry.moments].filter((m) => m.body.trim()).sort((a, b) => a.time.localeCompare(b.time))

  return (
    <PageFrame dedication={dedication} handle={handle} mood={entry.mood} themed={themed} label={shortDate(entry.date)}>
      <h1 aria-label={`${weekday} ${dayMonth} ${year}`}>
        <span className="type-serif block text-[56px] text-vanilla/90">{weekday[0] + weekday.slice(1).toLowerCase()}</span>
        <span className="flex items-start gap-3">
          <span className="type-display text-[84px] text-vanilla">{dayMonth}</span>
          <span className="type-meta mt-[0.6em] text-vanilla/60">{year}</span>
        </span>
      </h1>
      <MoodSpine mood={entry.mood} horizontal className="mt-5 h-1.25 w-full rounded-full" />

      {sealed ? (
        <div className="mt-12">
          <div className="h-40 w-full rounded-[10px] bg-ink" />
          <p className="type-meta mt-3 text-vanilla">In the Lockbin</p>
        </div>
      ) : (
        <>
          {entry.track && (
            <div className="mt-10">
              <SongCard track={entry.track} />
            </div>
          )}

          <div className="mt-10 max-w-4xl">
            <ol>
              {moments.map((m, i) => (
                <li key={m.id} className={`print-avoid-break ${i > 0 ? 'rule-hairline mt-10 pt-10' : ''}`}>
                  <p className="type-meta mb-3 flex min-h-6.25 items-center text-mango">{formatTime(m.time)}</p>
                  <p className="type-body max-w-none whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ol>

            {entry.media?.length > 0 && (
              <section aria-label="Photos and video" className={moments.length ? 'rule-hairline mt-10 pt-6' : ''}>
                <p className="type-meta flex min-h-9 items-center text-vanilla/50">{mediaSummary(entry.media)}</p>
                <div className="mt-4">
                  <MediaGallery items={entry.media} layout={entry.mediaLayout} meta={shortDate(entry.date)} />
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </PageFrame>
  )
}
