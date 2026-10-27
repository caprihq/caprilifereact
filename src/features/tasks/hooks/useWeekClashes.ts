import { useMemo } from 'react'

import { fromConflict } from '../logic/clashItems'
import type { Conflict } from '../logic/suggestionEdits'
import { useDismissedOverlaps } from './useDismissedOverlaps'

/** The week's conflicts from the backend, minus any the user chose to keep. */
export const useWeekClashes = (conflicts: readonly Conflict[], timeZone: string) => {
  const { dismissed, dismiss } = useDismissedOverlaps()

  const items = useMemo(
    () => conflicts.map((conflict) => fromConflict(conflict, timeZone)).filter((item) => !dismissed.has(item.key)),
    [conflicts, timeZone, dismissed],
  )

  return { items, keepBoth: dismiss }
}
