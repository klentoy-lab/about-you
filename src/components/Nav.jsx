import { useEffect, useRef, useState } from 'react'
import Wordmark from './Wordmark.jsx'

const MAIN = [
  { path: '', label: 'Today', match: ['today'] },
  { path: 'timeline', label: 'Timeline', match: ['timeline'] },
  { path: 'calendar', label: 'Calendar', match: ['calendar'] },
  { path: 'media', label: 'Media wall', match: ['media'] },
  { path: 'search', label: 'Search', match: ['search'] },
  { path: 'lockbin', label: 'Lockbin', match: ['lockbin'] },
  { path: 'diaries', label: 'Diaries', match: ['diaries', 'publicDiary', 'publicEntry'] },
  { path: 'following', label: 'Following', match: ['following'] },
]

const SIDE = [
  { path: 'settings', label: 'Settings', match: ['settings'] },
  { path: 'tokens', label: 'Tokens', match: ['tokens'] },
]

function Item({ item, route }) {
  const active = item.match.includes(route.name)
  return (
    <a
      href={`#/${item.path}`}
      aria-current={active ? 'page' : undefined}
      className={`type-meta relative flex items-center gap-2 whitespace-nowrap py-1 transition-colors ${
        active ? 'text-mango' : 'text-vanilla/80 hover:text-mango'
      }`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-mango transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
      {item.label}
    </a>
  )
}

// On narrow screens the links scroll sideways. Soft fades show there's more on that side,
// instead of words being cut off at the screen edge.
const FADE = 36
const maskFor = ({ start, end }) => {
  if (start && end) return 'none'
  const left = start ? 'black 0' : `transparent 0, black ${FADE}px`
  const right = end ? 'black 100%' : `black calc(100% - ${FADE}px), transparent 100%`
  return `linear-gradient(to right, ${left}, ${right})`
}

export default function Nav({ route }) {
  const scroller = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = () => {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 })
  }

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep the current page's link in view when it's off to the side.
  useEffect(() => {
    const el = scroller.current
    const active = el?.querySelector('[aria-current="page"]')
    if (!el || !active) return
    const a = active.getBoundingClientRect()
    const box = el.getBoundingClientRect()
    if (a.left < box.left + FADE || a.right > box.right - FADE) {
      el.scrollTo({ left: el.scrollLeft + (a.left - box.left) - box.width / 2 + a.width / 2, behavior: 'smooth' })
    }
  }, [route.name])

  const mask = maskFor(edges)

  return (
    <nav aria-label="About You" className="sticky top-0 z-40 border-b border-vanilla/10 bg-ink/85 backdrop-blur-md">
      <div className="flex h-14 items-center">
        <a
          href="#/"
          aria-label="About You — today"
          className="shrink-0 pl-5 pr-5 text-[21px] text-vanilla transition-opacity hover:opacity-80 md:pl-8 md:pr-7"
        >
          <Wordmark />
        </a>

        <div
          ref={scroller}
          onScroll={measure}
          className="flex h-full min-w-0 flex-1 items-center gap-7 overflow-x-auto pr-5 [scrollbar-width:none] md:pr-8 [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          <ul className="flex shrink-0 items-center gap-5">
            {MAIN.map((item) => (
              <li key={item.label}>
                <Item item={item} route={route} />
              </li>
            ))}
          </ul>

          <ul className="ml-auto flex shrink-0 items-center gap-5">
            {SIDE.map((item) => (
              <li key={item.label}>
                <Item item={item} route={route} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
