import { useMemo } from 'react'
import MoodSpine from '../components/MoodSpine.jsx'
import { shortDate } from '../lib/date.js'
import { listPublicDiaries } from '../lib/diaries.js'
import { getSettings } from '../lib/store.js'
import { useStoreVersion } from '../lib/useStore.js'

export default function Diaries() {
  const v = useStoreVersion()
  const diaries = useMemo(() => listPublicDiaries(), [v])
  const settings = getSettings()
  const mineListed = diaries.some((d) => d.mine)

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <p className="type-meta text-vanilla/60">
        {diaries.length} {diaries.length === 1 ? 'diary' : 'diaries'} open to read
      </p>
      <h1 className="type-display mt-4 text-[clamp(48px,8vw,120px)] text-vanilla">Diaries</h1>

      {!mineListed && (
        <p className="type-meta mt-6 max-w-[60ch] leading-relaxed text-vanilla/60">
          Your diary isn’t listed yet — it appears here once an entry is public.{' '}
          <a href={settings.handle ? '#/' : '#/settings'} className="text-mango hover:text-vanilla">
            {settings.handle ? 'Write today →' : 'Set up your diary →'}
          </a>
        </p>
      )}

      <ol className="mt-14">
        {diaries.map((d) => (
          <li key={d.handle} className="rule-hairline">
            <a href={`#/d/${d.handle}`} className="group relative block py-10 pl-6 md:py-14 md:pl-10">
              <MoodSpine mood={d.latest?.mood} className="absolute inset-y-6 left-0 w-[6px]" />
              <p className="type-meta text-vanilla">To</p>
              <h2 className="type-display mt-2 break-words text-[clamp(44px,9vw,148px)] text-vanilla group-hover:text-mango group-focus-visible:text-mango">
                {d.dedication}
              </h2>
              <p className="type-meta mt-5 flex flex-wrap gap-x-5 gap-y-1 text-vanilla/60">
                <span>By {d.ownerName}</span>
                <span>
                  {d.count} {d.count === 1 ? 'entry' : 'entries'}
                </span>
                <span>Since {shortDate(d.firstDate)}</span>
                <span>Latest {shortDate(d.latest.date)}</span>
                {d.mine && <span className="text-vanilla">Yours</span>}
                {d.sample && <span>Sample</span>}
              </p>
            </a>
          </li>
        ))}
      </ol>
    </main>
  )
}
