import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'qrcode'

/** Full URL for a hash route, e.g. shareUrl('d/valerie'). */
export const shareUrl = (path) => `${window.location.origin}${window.location.pathname}#/${path}`

const isLocal = () => ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

/**
 * Share a public diary or entry: link to copy, the device's share menu where available,
 * and a QR code someone can scan from your screen (or save and send).
 */
export function ShareButton({ path, title, name, className = 'chip', label = 'Share' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        aria-haspopup="dialog"
        className={className}
      >
        <ShareGlyph />
        {label}
      </button>
      <ShareSheet open={open} onClose={() => setOpen(false)} path={path} title={title} name={name} />
    </>
  )
}

export default function ShareSheet({ open, onClose, path, title, name }) {
  const url = shareUrl(path)
  const [qr, setQr] = useState(null)
  const [copied, setCopied] = useState(false)
  const closeRef = useRef(null)
  const linkRef = useRef(null)

  useEffect(() => {
    if (!open) return
    let live = true
    QRCode.toDataURL(url, { width: 560, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#100C08', light: '#FFF1D6' } })
      .then((d) => live && setQr(d))
      .catch(() => live && setQr(null))
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => closeRef.current?.focus())
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      live = false
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, url, onClose])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2200)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      linkRef.current?.select()
    }
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: `${title} — on About You`, url })
    } catch {
      /* dismissed */
    }
  }

  const fileName = `about-you-${path.replace(/[^a-z0-9]+/gi, '-')}.png`

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-95 flex items-end justify-center bg-ink/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            className="max-h-[92svh] w-full max-w-104 overflow-y-auto rounded-t-[20px] bg-raised p-6 text-vanilla sm:rounded-[20px]"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="type-meta text-vanilla/60">Share</p>
                <h2 id="share-title" className="mt-2">
                  <span className="type-meta block text-vanilla">To</span>
                  <span className="type-display mt-1 block wrap-break-word text-[40px] text-vanilla">{name}</span>
                </h2>
                {title !== name && <p className="type-serif mt-2 text-[22px] text-vanilla/80">{title}</p>}
              </div>
              <button ref={closeRef} type="button" onClick={onClose} className="type-meta shrink-0 py-1 text-mango hover:text-vanilla">
                Close ✕
              </button>
            </div>

            <div className="mx-auto mt-6 w-full max-w-3xs bg-vanilla p-3" style={{ borderRadius: 16 }}>
              {qr ? (
                <img src={qr} alt={`QR code linking to ${url}`} className="block aspect-square w-full" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="aspect-square w-full bg-fog" />
              )}
            </div>
            <p className="type-meta mt-3 text-center text-vanilla/55">Scan to open</p>

            <label className="mt-6 block">
              <span className="type-meta text-vanilla/60">Link</span>
              <input
                ref={linkRef}
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="mt-2 w-full truncate border-b border-vanilla/25 bg-transparent pb-2 text-[14px] text-vanilla focus:border-mango focus:outline-none focus-visible:outline-none"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={copy} className="chip chip-solid" aria-live="polite">
                {copied ? 'Copied ✓' : 'Copy link'}
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button type="button" onClick={nativeShare} className="chip">
                  Share…
                </button>
              )}
              {qr && (
                <a href={qr} download={fileName} className="chip">
                  Save QR
                </a>
              )}
            </div>

            {isLocal() && (
              <p className="mt-5 text-[13px] leading-relaxed text-vanilla/55">
                This is a local preview address, so the link and QR only open on this computer until About You is online.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ShareGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}
