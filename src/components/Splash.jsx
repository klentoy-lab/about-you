import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import FitText from './FitText.jsx'
import { SOFT } from '../lib/motion.js'
import { TZ_LABEL, clockLabel, headline, toDateKey } from '../lib/date.js'

const EASE = SOFT

/**
 * Loading screen shown each time About You opens. Stays up until fonts are ready
 * and at least `minMs` has passed, then calls onDone.
 */
export default function Splash({ onDone, minMs = 2600 }) {
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
    Promise.all([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, duration))]).then(
      () => !cancelled && onDone(),
    )

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [duration, onDone])

  const { weekday, dayMonth, year } = headline(toDateKey())

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Welcome to About You, your digital diary. Loading."
      className="fixed inset-0 z-100 flex flex-col justify-between overflow-hidden bg-ink px-5 py-6 md:px-12 md:py-10"
      exit={{ opacity: 0, scale: 1.01 }}
      transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* warm glow drifting behind the name */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[-20%] top-[10%] h-[90vmin] w-[90vmin] rounded-full opacity-60 blur-[90px] motion-safe:animate-[drift_18s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle, #FF9408 0%, #CA3F16 40%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-30%] right-[-15%] h-[80vmin] w-[80vmin] rounded-full opacity-50 blur-[100px] motion-safe:animate-[drift_22s_ease-in-out_infinite_reverse]"
          style={{ background: 'radial-gradient(circle, #95122C 0%, transparent 70%)' }}
        />
      </div>

      <motion.p
        className="type-meta relative text-vanilla/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {weekday} {dayMonth} {year} · {clockLabel()} {TZ_LABEL}
      </motion.p>

      <div className="relative">
        <motion.p
          className="type-meta text-vanilla"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
        >
          Welcome to
        </motion.p>

        <motion.div
          className="mt-3"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
        >
          <FitText as="h1" className="text-vanilla" style={{ lineHeight: 0.84 }}>
            <span className="type-display" style={{ letterSpacing: '-0.05em' }}>
              About
            </span>{' '}
            <span className="type-serif text-mango" style={{ fontSize: '1.16em', lineHeight: 0.7 }}>
              you
            </span>
          </FitText>
        </motion.div>

        <motion.p
          className="type-serif mt-4 text-[clamp(28px,5vw,64px)] text-vanilla md:mt-6"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.75, ease: EASE }}
        >
          your digital diary
        </motion.p>
      </div>

      <div className="relative">
        <div className="h-0.75 w-full overflow-hidden rounded-full bg-vanilla/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FF9408, #CA3F16 55%, #95122C)' }}
          />
        </div>
        <p className="type-meta mt-3 flex justify-between text-vanilla/60">
          <span>Opening your pages</span>
          <span className="tabular-nums">{String(pct).padStart(3, '0')}%</span>
        </p>
      </div>
    </motion.div>
  )
}
