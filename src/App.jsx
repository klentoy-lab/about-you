import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import CloudBanner from './components/CloudBanner.jsx'
import Nav from './components/Nav.jsx'
import Splash from './components/Splash.jsx'
import { getEntry, getSettings } from './lib/store.js'
import { parseRoute, useRoute } from './lib/router.js'
import { toDateKey } from './lib/date.js'
import { applyMoodTheme } from './lib/theme.js'
import { useStoreVersion } from './lib/useStore.js'
import Calendar from './views/Calendar.jsx'
import Diaries from './views/Diaries.jsx'
import Following from './views/Following.jsx'
import Lockbin from './views/Lockbin.jsx'
import MediaWall from './views/MediaWall.jsx'
import PrintView from './views/PrintView.jsx'
import PublicDiary from './views/PublicDiary.jsx'
import PublicEntry from './views/PublicEntry.jsx'
import Search from './views/Search.jsx'
import Settings from './views/Settings.jsx'
import Timeline from './views/Timeline.jsx'
import Today from './views/Today.jsx'
import Tokens from './views/Tokens.jsx'

// These views set the mood theme (and the print view its page colours) themselves.
const THEMED_VIEWS = ['today', 'publicEntry', 'publicDiary', 'print', 'search']

const TITLES = {
  today: 'Today',
  timeline: 'Timeline',
  calendar: 'Calendar',
  media: 'Media wall',
  search: 'Search',
  lockbin: 'Lockbin',
  diaries: 'Diaries',
  following: 'Following',
  settings: 'Settings',
  tokens: 'Tokens',
}

function View({ route }) {
  switch (route.name) {
    case 'today':
      return <Today date={route.date} />
    case 'timeline':
      return <Timeline />
    case 'calendar':
      return <Calendar month={route.param} />
    case 'media':
      return <MediaWall />
    case 'search':
      return <Search />
    case 'lockbin':
      return <Lockbin />
    case 'diaries':
      return <Diaries />
    case 'following':
      return <Following />
    case 'publicDiary':
      return <PublicDiary handle={route.handle} />
    case 'publicEntry':
      return <PublicEntry handle={route.handle} date={route.date} />
    case 'settings':
      return <Settings />
    case 'tokens':
      return <Tokens />
    default:
      return <Today />
  }
}

export default function App() {
  const route = useRoute()
  // The print view is a working page, not an arrival — no welcome screen in front of it.
  const [loading, setLoading] = useState(() => parseRoute().name !== 'print')
  // Re-read every time the diary changes: as soon as a signed-in profile arrives from the server,
  // the three questions disappear on their own instead of asking a returning person to introduce themselves again.
  const onboarded = Boolean(getSettings().ownerName)
  const doneLoading = useCallback(() => setLoading(false), [])
  const storeVersion = useStoreVersion()

  // Everywhere else, the app wears today's mood.
  useEffect(() => {
    if (!THEMED_VIEWS.includes(route.name)) applyMoodTheme(getEntry(toDateKey()).mood)
  }, [route.name, storeVersion])

  // Visitors reading someone else's diary skip onboarding.
  const visiting = route.name === 'publicDiary' || route.name === 'publicEntry' || route.name === 'diaries'
  const routeKey = `${route.name}/${route.kind ?? ''}/${route.handle ?? ''}/${route.date ?? route.param ?? ''}`

  useEffect(() => {
    window.scrollTo(0, 0)
    if (route.name === 'print') return // PrintView names the document after the PDF
    const name = route.handle ? `To ${route.handle}` : TITLES[route.name] ?? 'Today'
    document.title = `${name} · About You`
  }, [routeKey])

  if (route.name === 'print') return <PrintView kind={route.kind} param={route.param} />

  return (
    <>
      <AnimatePresence>{loading && <Splash key="splash" onDone={doneLoading} />}</AnimatePresence>

      {!onboarded && !visiting ? (
        !loading && <Settings onboarding />
      ) : (
        <>
          <Nav route={route} />
          <CloudBanner />
          <View route={route} />
        </>
      )}
    </>
  )
}
