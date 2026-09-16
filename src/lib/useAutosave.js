import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Debounced autosave. Saves `value` `delay` ms after the last change,
 * and flushes immediately on unmount, tab hide, or page unload so nothing is lost.
 */
export function useAutosave(value, save, { delay = 700, initialSavedAt = null } = {}) {
  const [status, setStatus] = useState({ state: 'idle', at: initialSavedAt ? new Date(initialSavedAt) : null })
  const lastSaved = useRef(JSON.stringify(value))
  const pending = useRef(null)
  const saveRef = useRef(save)
  saveRef.current = save

  const flush = useCallback(() => {
    if (!pending.current) return
    const v = pending.current
    pending.current = null
    saveRef.current(v)
    lastSaved.current = JSON.stringify(v)
    setStatus({ state: 'saved', at: new Date() })
  }, [])

  useEffect(() => {
    if (JSON.stringify(value) === lastSaved.current) return
    pending.current = value
    setStatus((s) => ({ ...s, state: 'pending' }))
    const t = setTimeout(flush, delay)
    return () => clearTimeout(t)
  }, [value, delay, flush])

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [flush])

  return status
}
