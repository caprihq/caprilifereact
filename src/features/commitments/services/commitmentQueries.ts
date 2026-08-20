import { useQuery } from '@tanstack/react-query'

import { CommitmentEntity, base44, queryKeys } from '@/services/api'
import { QUERY_DEFAULTS } from '@/config'
import type { CalendarEvent, Commitment } from '@/types/entities'

/**
 * Commitment and calendar reads.
 *
 * Moved out of the tasks feature, where they were the direct cause of the
 * `commitments ⇄ tasks` dependency cycle.
 */

export const useCommitments = (userEmail: string | null) =>
  useQuery({
    queryKey: queryKeys.commitments(userEmail),
    enabled: !!userEmail,
    queryFn: async (): Promise<readonly Commitment[]> =>
      CommitmentEntity().filter({ created_by: userEmail }),
  })

/**
 * Today's Google Calendar events, when the user has connected the integration.
 *
 * The backend answers `{ events: null, connected: false }` rather than an error
 * when there is no connection, so a missing integration is an empty list, not a
 * failure.
 */
export const useCalendarEvents = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.calendarEvents(),
    enabled,
    staleTime: QUERY_DEFAULTS.calendarStaleTime,
    queryFn: async (): Promise<readonly CalendarEvent[]> => {
      const response = (await base44.functions.invoke('getUserCalendarEvents', {})) as {
        data?: { events?: CalendarEvent[] | null }
      }
      return response.data?.events ?? []
    },
  })
