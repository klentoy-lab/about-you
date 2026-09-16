import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import FitText from './FitText.jsx'
import { TZ_LABEL, clockLabel, headline, toDateKey } from '../lib/date.js'

const EASE = [0.2, 0.7, 0.2, 1]

/**
 * Loading screen shown each time Ember opens. Stays up until fonts are ready
 * and at least `minMs` has passed, then calls onDone.
 */
export default function Splash({ onDone, minMs = 1900 }) {
  const reduce = useReducedMotion()
  const duration = reduce ? 500 : minMs
  const [pct, setPct] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (t) => {
      setPct(Math.min(100, Math.round(((t - start) / duration) * 100)))
      if (t - start < duration) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    let cancelled = false
    Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, duration)),
    ]).then(() => !cancelled && onDone())

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [duration, onDone])

  const key = toDateKey()
  const { weekday, dayMonth, year } = headline(key)

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Welcome to Ember, your digital diary. Loading."
      className="fixed inset-0 z-[100] flex flex-col justify-between bg-ink px-5 py-6 md:px-12 md:py-10"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <motion.p
        className="type-meta text-vanilla/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {weekday} {dayMonth} {year} · {clockLabel()} {TZ_LABEL}
      </motion.p>

      <div>
        <motion.p
          className="type-meta text-vanilla"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: EASE }}
        >
          Welcome to
        </motion.p>
        <motion.div
          className="mt-3 overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
        >
          <FitText as="h1" className="type-display text-vanilla" style={{ letterSpacing: '-0.05em', lineHeight: 0.84 }}>
            Ember
          </FitText>
        </motion.div>
        <motion.p
          className="type-display mt-4 text-[clamp(22px,4vw,56px)] text-vanilla md:mt-6"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.55, ease: EASE }}
        >
          Your digital diary
        </motion.p>
      </div>

      <div>
        <div className="h-px w-full bg-vanilla/15">
          <div className="h-px bg-vanilla" style={{ width: `${pct}%` }} />
        </div>
        <p className="type-meta mt-3 flex justify-between text-vanilla/60">
          <span>Opening your pages</span>
          <span className="tabular-nums">{String(pct).padStart(3, '0')}%</span>
        </p>
      </div>
    </motion.div>
  )
}
