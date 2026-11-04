import { homeFocus } from '../logic/dayFocus'
import type { TaskFeed } from './useTaskFeed'
import { useUpNext } from './useUpNext'

/**
 * CAPRI's Up Next answer, and what Home shows from it.
 *
 * Every open task is offered, and the local top four carry the screen until the
 * answer arrives. The hero is among them: CAPRI decides what to start, so leaving the
 * local pick out would take that choice away from it. A task booked for right now
 * still comes first — see `homeFocus`.
 */
export const useHomeFocus = (feed: TaskFeed) => {
  const upNext = useUpNext({
    candidates: feed.actionable,
    shortlist: feed.ranked,
    userEmail: feed.userEmail,
    nowMs: feed.nowMs,
    timeZone: feed.timeZone,
  })

  const focus = homeFocus({
    current: feed.currentTask,
    pick: upNext.hero,
    fallback: feed.heroTask,
    queue: upNext.entries,
    timeZone: feed.timeZone,
  })

  return { upNext, focus }
}
