import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Nav from './components/Nav.jsx'
import Splash from './components/Splash.jsx'
import { getSettings } from './lib/store.js'
import { useRoute } from './lib/router.js'
import Calendar from './views/Calendar.jsx'
import Diaries from './views/Diaries.jsx'
import Lockbin from './views/Lockbin.jsx'
import MediaWall from './views/MediaWall.jsx'
import PublicDiary from './views/PublicDiary.jsx'
import PublicEntry from './views/PublicEntry.jsx'
import Search from './views/Search.jsx'
import Settings from './views/Settings.jsx'
import Timeline from './views/Timeline.jsx'
import Today from './views/Today.jsx'
import Tokens from './views/Tokens.jsx'

const TITLES = {
  today: 'Today',
  timeline: 'Timeline',
  calendar: 'Calendar',
  media: 'Media wall',
  search: 'Search',
  lockbin: 'Lockbin',
  diaries: 'Diaries',
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
  const [loading, setLoading] = useState(true)
  const [onboarded, setOnboarded] = useState(() => Boolean(getSettings().ownerName))
  const doneLoading = useCallback(() => setLoading(false), [])

  // Visitors reading someone else's diary skip onboarding.
  const visiting = route.name === 'publicDiary' || route.name === 'publicEntry' || route.name === 'diaries'
  const routeKey = `${route.name}/${route.handle ?? ''}/${route.date ?? route.param ?? ''}`

  useEffect(() => {
    window.scrollTo(0, 0)
    const name = route.handle ? `To ${route.handle}` : TITLES[route.name] ?? 'Today'
    document.title = `${name} · Ember`
  }, [routeKey])

  return (
    <>
      <AnimatePresence>{loading && <Splash key="splash" onDone={doneLoading} />}</AnimatePresence>

      {!onboarded && !visiting ? (
        !loading && <Settings onboarding onDone={() => setOnboarded(true)} />
      ) : (
        <>
          <Nav route={route} />
          <View route={route} />
        </>
      )}
    </>
  )
}
