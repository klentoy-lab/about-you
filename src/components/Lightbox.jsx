import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useFileUrl } from '../lib/mediaStore.js'

/**
 * Full-bleed viewer on ink. ←/→ to move, Esc to close, swipe on touch.
 * `items` are media items; each may carry `meta` (e.g. a date line) and `href` (link to its day).
 */
export default function Lightbox({ items, index, onIndex, onClose }) {
  const closeRef = useRef(null)
  const touch = useRef(null)
  const open = index != null && items[index]

  const go = (delta) => onIndex((index + delta + items.length) % items.length)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [Boolean(open)])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && items.length > 1) go(1)
      else if (e.key === 'ArrowLeft' && items.length > 1) go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${open.kind === 'video' ? 'Video' : 'Photo'} ${index + 1} of ${items.length}`}
          className="fixed inset-0 z-[90] flex flex-col bg-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => (touch.current = e.clientX)}
          onPointerUp={(e) => {
            const dx = touch.current == null ? 0 : e.clientX - touch.current
            touch.current = null
            if (e.pointerType !== 'mouse' && Math.abs(dx) > 60 && items.length > 1) go(dx < 0 ? 1 : -1)
          }}
        >
          <div className="type-meta flex items-center justify-between px-5 py-4 text-vanilla/70 md:px-8">
            <span className="tabular-nums">
              {index + 1} / {items.length}
            </span>
            <button ref={closeRef} type="button" onClick={onClose} className="py-1 text-mango hover:text-vanilla">
              Close ✕
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-20">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={open.id}
                className="flex h-full w-full items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              >
                <LightboxMedia item={open} />
              </motion.div>
            </AnimatePresence>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => go(-1)}
                  className="type-meta absolute inset-y-0 left-0 hidden w-20 items-center justify-center text-[20px] text-vanilla/60 hover:text-mango md:flex"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() => go(1)}
                  className="type-meta absolute inset-y-0 right-0 hidden w-20 items-center justify-center text-[20px] text-vanilla/60 hover:text-mango md:flex"
                >
                  →
                </button>
              </>
            )}
          </div>

          <div className="type-meta flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 md:px-8">
            <span className="text-vanilla">{open.caption}</span>
            <span className="flex gap-5 text-vanilla/55">
              {open.meta}
              {open.href && (
                <a href={open.href} onClick={onClose} className="text-mango hover:text-vanilla">
                  Open day →
                </a>
              )}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function LightboxMedia({ item }) {
  const url = useFileUrl(item.id)
  if (!url) return <div className="h-40 w-40 bg-espresso" aria-hidden />
  const cls = 'max-h-full max-w-full object-contain'
  return item.kind === 'video' ? (
    <video src={url} className={cls} controls autoPlay muted playsInline style={{ maxHeight: 'calc(100svh - 128px)' }} />
  ) : (
    <img src={url} alt={item.caption || 'Photo'} className={cls} style={{ maxHeight: 'calc(100svh - 128px)' }} draggable={false} />
  )
}
