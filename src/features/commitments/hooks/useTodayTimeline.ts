import { useMemo } from 'react'

import { buildTodayTimeline } from '@/features/commitments/logic/timeline'
import type { TimelineItem } from '@/features/commitments/logic/timeline'
import { usePlan } from '@/hooks/usePlan'
import { useCalendarEvents, useCommitments } from '../services/commitmentQueries'
import { useCalendarImport } from '../services/calendarImport'
import type { Task } from '@/types/entities'

/**
 * Today's merged commitment timeline.
 *
 * Scheduled-event tasks come from the caller's already-loaded task list rather
 * than a second query: the web client ran a separate
 * `filter({ is_scheduled_event: true })` request for tasks it had already
 * fetched, doubling the round trips for the same rows.
 *
 * Calendar access is gated on `calendar_sync`, so free users make no calendar
 * request at all instead of one that always comes back not-connected.
 */

export type TodayTimeline = {
  readonly items: readonly TimelineItem[]
  readonly isLoading: boolean
  /** False when the user has not linked a calendar, which is not an error. */
  readonly calendarConnected: boolean
  readonly calendarUnlocked: boolean
}

export const useTodayTimeline = (options: {
  readonly userEmail: string | null
  readonly tasks: readonly Task[]
  readonly nowMs: number
  readonly timeZone: string
}): TodayTimeline => {
  const { userEmail, tasks, nowMs, timeZone } = options
  const { hasAccess } = usePlan()
  const calendarUnlocked = hasAccess('calendar_sync')

  // Meetings are copied into commitments so the reminder sweep can count down to
  // them; the cron cannot read a calendar itself. Throttled inside the hook.
  useCalendarImport(calendarUnlocked && !!userEmail, userEmail)

  const commitmentsQuery = useCommitments(userEmail)
  const calendarQuery = useCalendarEvents(calendarUnlocked && !!userEmail)

  // The `?? []` defaults live inside the memo on purpose: a fresh [] in the
  // dependency array is a new reference every render, which silently defeats the
  // memo and re-runs the merge on every pass.
  const commitmentsData = commitmentsQuery.data
  const eventsData = calendarQuery.data

  const items = useMemo(
    () =>
      buildTodayTimeline({
        commitments: commitmentsData ?? [],
        tasks,
        events: eventsData ?? [],
        nowMs,
        timeZone,
      }),
    [commitmentsData, eventsData, tasks, nowMs, timeZone],
  )

  return {
    items,
    isLoading: commitmentsQuery.isLoading,
    // An empty list from a successful fetch means connected with nothing today.
    calendarConnected: calendarUnlocked && calendarQuery.isSuccess,
    calendarUnlocked,
  }
}
