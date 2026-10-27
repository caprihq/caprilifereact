import { useCallback, useState } from 'react'

import { mmkvPrefStore } from '@/services/storage'
import { parseDismissed, withDismissed } from '../logic/dismissedOverlaps'

const STORE_KEY = 'capri.overlaps.dismissed'

/**
 * Clashes the user chose to keep, remembered on the device.
 *
 * Read once; written through on each "keep both" (§2.3: storage at the edge).
 * Shared by the planner (today) and the review screen (this week).
 */
export const useDismissedOverlaps = () => {
  const [dismissed, setDismissed] = useState(() => parseDismissed(mmkvPrefStore.getString(STORE_KEY)))

  const dismiss = useCallback((key: string) => {
    setDismissed((current) => {
      const next = withDismissed(current, key)
      mmkvPrefStore.setString(STORE_KEY, JSON.stringify(next))
      return new Set(next)
    })
  }, [])

  return { dismissed, dismiss }
}
