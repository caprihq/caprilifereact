import { useCallback, useMemo } from 'react'

import type { TimelineItem } from '@/features/commitments'
import { isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'
import { findOverlaps, fixedSpans } from '../logic/overlaps'
import { useDismissedOverlaps } from './useDismissedOverlaps'


/**
 * Today's clashes between planned tasks and everything else in the day.
 *
 * Takes the timeline the caller already has rather than fetching its own, so the
 * planner and Home pay nothing extra for it. "Keep both" is remembered on the device.
 */
export const useTodayOverlaps = (input: {
  readonly tasks: readonly Task[]
  readonly timeline: readonly TimelineItem[]
  readonly nowMs: number
  readonly timeZone: string
}) => {
  const { tasks, timeline, nowMs, timeZone } = input
  const { dismissed, dismiss } = useDismissedOverlaps()

  const overlaps = useMemo(() => {
    // Scheduled events are fixed items in the timeline, not planned work.
    const planned = tasks.filter(
      (task) => !task.is_scheduled_event && isLocalToday(task.scheduled_start_time, nowMs, timeZone),
    )
    return findOverlaps({ tasks: planned, fixed: fixedSpans(timeline), dismissed })
  }, [tasks, timeline, nowMs, timeZone, dismissed])

  const byTask = useMemo(() => new Map(overlaps.map((o) => [o.task.id, o])), [overlaps])

  // By key, so the same list can hold today's overlaps and the week's conflicts.
  const keepBoth = dismiss

  const overlapFor = useCallback((taskId: string) => byTask.get(taskId), [byTask])

  return { overlaps, overlapFor, keepBoth }
}
