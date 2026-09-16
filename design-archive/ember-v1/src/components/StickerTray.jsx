import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StickerArt from './StickerArt.jsx'
import { GiphyError, hasGiphyKey, searchGifs } from '../lib/giphy.js'
import { getRecent } from '../lib/recentStickers.js'
import { STICKERS } from '../lib/stickers.js'

const TABS = [
  { id: 'stickers', label: 'Stickers' },
  { id: 'gifs', label: 'GIFs' },
  { id: 'recent', label: 'Recent' },
]

let rememberedTab = 'stickers'

/**
 * Slides up from the bottom edge. Picking something calls onPick with
 * { kind, source, title, aspect, src?, preview? } and closes the tray.
 */
export default function StickerTray({ open, onClose, onPick }) {
  const [tab, setTab] = useState(rememberedTab)
  const tabRefs = useRef({})

  useEffect(() => {
    rememberedTab = tab
  }, [tab])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    requestAnimationFrame(() => tabRefs.current[rememberedTab]?.focus())
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose])

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = TABS.findIndex((t) => t.id === tab)
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length].id
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  const pick = (p) => {
    onPick(p)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Stickers and GIFs"
          className="fixed inset-x-0 bottom-0 z-50 bg-mist text-ink"
          style={{ borderRadius: 'var(--radius-tray) var(--radius-tray) 0 0' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="mx-auto max-w-[64rem] px-5 md:px-8">
            <div aria-hidden className="mx-auto mt-3 h-1 w-10 bg-fog" />

            <div className="mt-3 flex items-center gap-6 border-b border-fog">
              <div role="tablist" aria-label="Tray" className="flex gap-6" onKeyDown={onTabKey}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    ref={(el) => (tabRefs.current[t.id] = el)}
                    type="button"
                    role="tab"
                    id={`tray-tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls={`tray-panel-${t.id}`}
                    tabIndex={tab === t.id ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    className={`type-meta -mb-px border-b-2 py-3 ${tab === t.id ? 'border-ink text-ink' : 'border-transparent text-ink/60 hover:text-ink'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={onClose} className="type-meta ml-auto py-3 text-ink hover:underline">
                Close ✕
              </button>
            </div>

            <div role="tabpanel" id={`tray-panel-${tab}`} aria-labelledby={`tray-tab-${tab}`} className="h-[min(52svh,480px)]">
              {tab === 'stickers' && <StickerGrid onPick={pick} />}
              {tab === 'gifs' && <GifSearch onPick={pick} />}
              {tab === 'recent' && <RecentGrid onPick={pick} />}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StickerGrid({ onPick }) {
  return (
    <ul className="grid h-full grid-cols-4 content-start gap-2 overflow-y-auto py-5 sm:grid-cols-6 md:grid-cols-8">
      {STICKERS.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onPick({ kind: 'sticker', source: s.id, title: s.title, aspect: s.aspect })}
            aria-label={`Add ${s.title} sticker`}
            className="flex aspect-square w-full items-center justify-center p-2 hover:bg-fog focus-visible:bg-fog"
            style={{ borderRadius: 'var(--radius-media)' }}
          >
            <StickerArt item={{ kind: 'sticker', source: s.id }} />
          </button>
        </li>
      ))}
    </ul>
  )
}

function RecentGrid({ onPick }) {
  const recent = getRecent()
  if (!recent.length) return <p className="type-meta py-8 text-ink/60">Nothing picked yet — stickers and GIFs you use land here.</p>
  return (
    <ul className="grid h-full grid-cols-4 content-start gap-2 overflow-y-auto py-5 sm:grid-cols-6 md:grid-cols-8">
      {recent.map((p) => (
        <li key={`${p.kind}-${p.source}`}>
          <button
            type="button"
            onClick={() => onPick(p)}
            aria-label={`Add ${p.title}`}
            className="flex aspect-square w-full items-center justify-center overflow-hidden p-2 hover:bg-fog focus-visible:bg-fog"
            style={{ borderRadius: 'var(--radius-media)' }}
          >
            <StickerArt item={p} preview />
          </button>
        </li>
      ))}
    </ul>
  )
}

function GifSearch({ onPick }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [items, setItems] = useState([])
  // null until the first page arrives, so infinite scroll can't fire a duplicate first request.
  const [nextOffset, setNextOffset] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scroller = useRef(null)
  const sentinel = useRef(null)
  const request = useRef(null)
  const [cols, setCols] = useState(3)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(async (q, offset) => {
    request.current?.abort()
    const ctrl = new AbortController()
    request.current = ctrl
    setLoading(true)
    setError('')
    try {
      const page = await searchGifs({ query: q, offset, signal: ctrl.signal })
      setItems((prev) => {
        const base = offset === 0 ? [] : prev
        const seen = new Set(base.map((i) => i.id))
        return [...base, ...page.items.filter((i) => !seen.has(i.id))]
      })
      setNextOffset(page.nextOffset)
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(e instanceof GiphyError ? e.message : 'Something went wrong')
      setNextOffset(null)
    }
    if (request.current === ctrl) setLoading(false)
  }, [])

  // New search: start over from the top.
  useEffect(() => {
    if (!hasGiphyKey) return
    scroller.current?.scrollTo(0, 0)
    setItems([])
    setNextOffset(null)
    load(debounced, 0)
    return () => request.current?.abort()
  }, [debounced, load])

  // Infinite scroll: fetch the next page as the sentinel nears view.
  useEffect(() => {
    const el = sentinel.current
    if (!el || nextOffset == null || loading || error) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && load(debounced, nextOffset), {
      root: scroller.current,
      rootMargin: '400px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [nextOffset, loading, error, debounced, load, items.length])

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setCols(el.clientWidth < 520 ? 2 : el.clientWidth < 820 ? 3 : 4))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!hasGiphyKey) {
    return (
      <div className="max-w-[40rem] py-8">
        <p className="text-[18px] leading-relaxed text-ink">GIF search needs a Giphy API key.</p>
        <ol className="type-meta mt-5 list-decimal space-y-2 pl-5 leading-relaxed text-ink/75">
          <li>Get a free key at developers.giphy.com</li>
          <li className="normal-case tracking-normal">
            Add <code className="bg-fog px-1">VITE_GIPHY_API_KEY=your-key</code> to a file named <code className="bg-fog px-1">.env.local</code>
          </li>
          <li>Restart npm run dev</li>
        </ol>
        <p className="type-meta mt-5 text-ink/60">Stickers and Recent work without it.</p>
      </div>
    )
  }

  // Shortest-column masonry: appending a page never reshuffles what's already there.
  const columns = Array.from({ length: cols }, () => ({ h: 0, list: [] }))
  for (const item of items) {
    const c = columns.reduce((a, b) => (b.h < a.h ? b : a))
    c.list.push(item)
    c.h += item.preview.height / item.preview.width
  }

  return (
    <div ref={scroller} className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 bg-mist pb-3 pt-4">
        <label className="block">
          <span className="sr-only">Search GIFs</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs"
            className="w-full border-b border-fog bg-transparent pb-2 text-[20px] text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none focus-visible:outline-none"
          />
        </label>
        <p className="type-meta mt-2 flex justify-between text-ink/55">
          <span>{debounced ? `Results for “${debounced}”` : 'Trending'}</span>
          <span>Powered by GIPHY</span>
        </p>
      </div>

      <div className="flex items-start gap-2">
        {columns.map((c, i) => (
          <ul key={i} className="flex min-w-0 flex-1 flex-col gap-2">
            {c.list.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() =>
                    onPick({
                      kind: 'gif',
                      source: g.id,
                      title: g.title,
                      src: g.full.url,
                      preview: g.preview.url,
                      aspect: g.full.height / g.full.width,
                    })
                  }
                  aria-label={`Add GIF: ${g.title}`}
                  className="block w-full overflow-hidden bg-fog hover:outline hover:outline-2 hover:outline-ink"
                  style={{ aspectRatio: `${g.preview.width} / ${g.preview.height}`, borderRadius: 'var(--radius-media)' }}
                >
                  <img src={g.preview.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ))}
      </div>

      <div ref={sentinel} className="h-px" />
      <p className="type-meta py-5 text-center text-ink/60" role="status" aria-live="polite">
        {error || (loading ? 'Loading' : items.length === 0 ? 'No GIFs found' : nextOffset == null ? 'That’s all' : '')}
      </p>
    </div>
  )
}
