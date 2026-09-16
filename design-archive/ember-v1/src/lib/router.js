import { useSyncExternalStore } from 'react'

// Hash routes, so the static dev build works without server config:
//   #/                    today          #/diaries            everyone's public diaries
//   #/today/2026-09-10    a past day     #/d/valerie          one public diary
//   #/timeline            #/calendar     #/d/valerie/2026-09-10  one public entry
//   #/media  #/search  #/lockbin  #/settings  #/tokens

const read = () => window.location.hash.replace(/^#\/?/, '')

export function parseRoute(path = read()) {
  const [a = '', b, c] = path.split('/').filter(Boolean)
  if (a === '' || a === 'today') return { name: 'today', date: b ?? null }
  if (a === 'd' && b) return { name: c ? 'publicEntry' : 'publicDiary', handle: b, date: c ?? null }
  return { name: a, param: b ?? null }
}

export function navigate(path) {
  const next = `#/${path.replace(/^\//, '')}`
  if (window.location.hash !== next) window.location.hash = next
  window.scrollTo(0, 0)
}

const subscribe = (fn) => (window.addEventListener('hashchange', fn), () => window.removeEventListener('hashchange', fn))

export function useRoute() {
  const path = useSyncExternalStore(subscribe, read)
  return parseRoute(path)
}

/** Props for an <a> that routes without a full reload, keeping real hrefs for new-tab and a11y. */
export const linkTo = (path) => ({ href: `#/${path.replace(/^\//, '')}` })
