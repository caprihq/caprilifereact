import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/services/api'
import {
  checkCalendarConnection,
  connectCalendar,
  disconnectCalendar,
} from '../services/calendarConnection'
import type { ConnectionState } from '../services/calendarConnection'

/**
 * Connect / disconnect state for the Google Calendar connector.
 *
 * Kept out of the component so the row stays presentational, and so the
 * cached calendar events are invalidated in one place whenever the link
 * changes — the web version left them stale after a disconnect, so events kept
 * showing for a calendar that was no longer connected.
 */

export type CalendarConnection = {
  readonly status: ConnectionState | 'checking'
  readonly working: boolean
  readonly connect: () => Promise<void>
  readonly disconnect: () => Promise<void>
  readonly recheck: () => Promise<void>
}

export const useCalendarConnection = (
  enabled: boolean,
  onError?: (message: string) => void,
): CalendarConnection => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ConnectionState | 'checking'>('checking')
  const [working, setWorking] = useState(false)

  const invalidateEvents = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents() })
  }, [queryClient])

  const recheck = useCallback(async () => {
    setStatus('checking')
    setStatus(await checkCalendarConnection())
  }, [])

  useEffect(() => {
    if (!enabled) return
    let active = true
    const run = async () => {
      const next = await checkCalendarConnection()
      if (active) setStatus(next)
    }
    void run()
    return () => {
      active = false
    }
  }, [enabled])

  const run = useCallback(
    async (action: typeof connectCalendar) => {
      setWorking(true)
      try {
        const outcome = await action()
        if (outcome.kind === 'failed') {
          onError?.(outcome.message)
          return
        }
        setStatus(outcome.state)
        invalidateEvents()
      } finally {
        setWorking(false)
      }
    },
    [onError, invalidateEvents],
  )

  return {
    status,
    working,
    connect: useCallback(() => run(connectCalendar), [run]),
    disconnect: useCallback(() => run(disconnectCalendar), [run]),
    recheck,
  }
}
