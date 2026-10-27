import { useTodayTimeline } from '@/features/commitments'
import type { TaskFeed } from './useTaskFeed'
import { useTodayOverlaps } from './useTodayOverlaps'

/**
 * How many clashes today has, for the line on Home's Today's Plan card.
 *
 * The timeline queries are shared with Today's Commitments on the same screen, and
 * the calendar import behind them is throttled in storage, so this adds no requests.
 */
export const useHomeOverlapCount = (feed: TaskFeed): number => {
  const timeline = useTodayTimeline({
    userEmail: feed.userEmail,
    tasks: feed.allTasks,
    nowMs: feed.nowMs,
    timeZone: feed.timeZone,
  })
  const { overlaps } = useTodayOverlaps({
    tasks: feed.allTasks,
    timeline: timeline.items,
    nowMs: feed.nowMs,
    timeZone: feed.timeZone,
  })
  return overlaps.length
}
