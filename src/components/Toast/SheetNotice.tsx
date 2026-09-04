import { useEffect } from 'react'

import { NoticeCard } from './NoticeCard'
import { useFeedbackStore } from '@/store'

/**
 * A notice inside a sheet, in flow.
 *
 * Sheets present as their own native view controller above the root view, so the
 * floating `Toast` renders *behind* them: every message raised from Add Task, Task
 * Detail, the commitment form or the suggested plan was invisible — a free-plan
 * limit, a validation problem, a failed save, all silent.
 *
 * In flow rather than floating, and directly under the sheet's header, because a
 * message about the form you are filling in belongs attached to it. `fitToContents`
 * grows the sheet by the height of the card, which is the point: something appeared.
 *
 * Mounting this registers the sheet as the visible host so the root one stands down.
 */
export const SheetNotice = () => {
  const current = useFeedbackStore((state) => state.current)
  const addSheetHost = useFeedbackStore((state) => state.addSheetHost)
  const removeSheetHost = useFeedbackStore((state) => state.removeSheetHost)

  useEffect(() => {
    addSheetHost()
    return removeSheetHost
  }, [addSheetHost, removeSheetHost])

  if (!current) return null

  return <NoticeCard notice={current} />
}
