import { useEffect, useMemo, useRef, useState } from 'react'
import Masthead from '../components/Masthead.jsx'
import { DedicationGutter, EntryLine, MonthGroups } from '../components/EntryList.jsx'
import { shortDate } from '../lib/date.js'
import { getPublicDiary } from '../lib/diaries.js'
import { useStoreVersion } from '../lib/useStore.js'

/** A diary as anyone sees it: the dedication first, then every public entry. Read-only. */
export default function PublicDiary({ handle }) {
  const v = useStoreVersion()
  const diary = useMemo(() => getPublicDiary(handle), [handle, v])
  // The first screen is the masthead alone; the side dedication arrives once it has scrolled away.
  const header = useRef(null)
  const [pastMasthead, setPastMasthead] = useState(false)

  useEffect(() => {
    if (!header.current) return
    const io = new IntersectionObserver(([e]) => setPastMasthead(!e.isIntersecting), { rootMargin: '-40% 0px 0px 0px' })
    io.observe(header.current)
    return () => io.disconnect()
  }, [diary])

  if (!diary || diary.count === 0) return <NotFound />

  return (
    <main>
      <header ref={header} className="flex min-h-[calc(100svh-56px)] flex-col justify-end px-5 pb-12 md:px-12 md:pb-16">
        <Masthead
          name={diary.dedication}
          meta={`${diary.count} ${diary.count === 1 ? 'entry' : 'entries'} · First entry ${shortDate(diary.firstDate)}`}
        />
      </header>

      <DedicationGutter name={diary.dedication} visible={pastMasthead} />

      <div className="px-5 pb-32 md:pl-[116px] md:pr-12">
        <p className="type-meta rule-hairline py-6 text-vanilla/60">
          By {diary.ownerName}
          {diary.sample && ' · Sample diary'}
          {diary.mine && ' · This is how visitors see your diary'}
        </p>
        <MonthGroups
          entries={diary.entries}
          renderEntry={(e) => <EntryLine entry={e} href={`#/d/${diary.handle}/${e.date}`} />}
        />
      </div>
    </main>
  )
}

export function NotFound() {
  return (
    <main className="px-5 pb-32 pt-16 md:px-12">
      <h1 className="type-display text-[clamp(44px,7vw,96px)] text-vanilla">Nothing here</h1>
      <p className="type-body mt-6">This diary doesn’t exist, or nothing in it is public.</p>
      <a href="#/diaries" className="type-meta mt-8 inline-block text-mango hover:text-vanilla">
        ← All diaries
      </a>
    </main>
  )
}
