import { useSyncExternalStore } from 'react'
import { getVersion, subscribe } from './store.js'

/** Re-renders whenever the local diary changes (in this tab or another one). */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getVersion)
}
