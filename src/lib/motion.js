// One soft motion language for the whole app.
// SOFT eases out long and gently (no snap at the end); durations lean slow on purpose.
// Mirrors --ease-soft and the default transition duration in index.css.

export const SOFT = [0.22, 1, 0.36, 1]

export const DUR = {
  quick: 0.35, // small state changes: hovers, toggles
  base: 0.6, // sheets, trays, fades
  slow: 0.9, // entrances, the date setting itself
}

/** Fade + gentle rise, for things arriving on screen. */
export const rise = (delay = 0, distance = 10) => ({
  initial: { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DUR.slow, delay, ease: SOFT },
})
