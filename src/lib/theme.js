// Mood theme: <html data-mood="1…5"> switches the palette overrides in index.css.

import { useEffect } from 'react'

const THEME_COLOR = { 0: '#100C08', 1: '#1A1409', 2: '#17110E', 3: '#190E0B', 4: '#140A08', 5: '#100709' }

export function applyMoodTheme(mood) {
  const root = document.documentElement
  if (mood) root.dataset.mood = String(mood)
  else delete root.dataset.mood
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[mood ?? 0])
}

/** Keeps the app themed to `mood` while the calling view is on screen. */
export function useMoodTheme(mood) {
  useEffect(() => {
    applyMoodTheme(mood)
  }, [mood])
}
