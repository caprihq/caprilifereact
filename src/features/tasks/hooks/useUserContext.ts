import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useCalendarEvents, useCommitments } from '@/features/commitments'
import { usePlan } from '@/hooks/usePlan'
import { FocusTimeEntity, queryKeys, useCurrentUser } from '@/services/api'
import { buildContextSummary } from '../logic/userContext'
import type { FocusTime } from '@/types/entities'

/**
 * The context block every AI prompt should open with.
 *
 * The web client prepends this to three of its calls, and it is what makes CAPRI's
 * answers *load-aware*: told that six hours are already booked, the model ranks a
 * ten-minute errand above a deep-work block, which is the correct advice and not
 * something it can infer from a task list alone.
 *
 * Nothing here is fetched for this hook alone. Commitments and calendar events are
 * the same queries Today's Commitments already runs, so they come from the React
 * Query cache; only the focus-time blocks are new, and they are read once per user.
 *
 * The summary is `null` until the user has loaded, so a caller can send the prompt
 * without context rather than block on it — a slower, less personal answer beats no
 * answer.
 */

/**
 * The user's configured focus blocks.
 *
 * Long-lived: these change when someone edits their preferences, not while they
 * work, so this is deliberately not refetched on focus.
 */
const useFocusTimes = (userEmail: string | null) =>
  useQuery({
    queryKey: queryKeys.focusTimes(userEmail),
    enabled: !!userEmail,
    queryFn: async (): Promise<readonly FocusTime[]> =>
      FocusTimeEntity().filter({ created_by: userEmail }),
  })

export const useUserContext = (options: {
  readonly userEmail: string | null
  readonly nowMs: number
  readonly timeZone: string
}): string | null => {
  const { userEmail, nowMs, timeZone } = options
  const { hasAccess } = usePlan()

  const { data: user } = useCurrentUser()
  const { data: focusTimes } = useFocusTimes(userEmail)
  const { data: commitments } = useCommitments(userEmail)
  // Same gate as the timeline: free users make no calendar request at all, rather
  // than one that always answers "not connected".
  const { data: calendarEvents } = useCalendarEvents(hasAccess('calendar_sync') && !!userEmail)

  return useMemo(() => {
    if (!user) return null

    return buildContextSummary({
      user,
      focusTimes: focusTimes ?? [],
      commitments: commitments ?? [],
      calendarEvents: calendarEvents ?? [],
      nowMs,
      timeZone,
    })
    // `nowMs` ticks every minute; the summary only changes when the day's load does,
    // but rebuilding a string is cheap next to the model call it feeds.
  }, [user, focusTimes, commitments, calendarEvents, nowMs, timeZone])
}
