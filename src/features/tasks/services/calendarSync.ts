import { base44 } from '@/services/api'
import { diag, logWarn } from '@/utils'

/**
 * Push CAPRI's scheduled blocks into the user's Google Calendar.
 *
 * The backend function sweeps every future task that has a scheduled time and
 * creates or updates its event, skipping anything unchanged since the last run —
 * so this takes no arguments and is safe to call more than once.
 *
 * Called after a plan is accepted, which is the moment a user expects the time to
 * appear in their calendar. Without it CAPRI held a plan the rest of their day could
 * not see, and a colleague booking over that hour had no way to know.
 *
 * Fire and forget. The task is already saved by the time this runs; a calendar that
 * has not caught up is a delay, not a failure, and the next accepted plan sweeps it
 * up anyway.
 */
export const syncTasksToCalendar = async (): Promise<void> => {
  try {
    const response = (await base44.functions.invoke('syncTasksToCalendar', {})) as {
      data?: { synced?: number; connected?: boolean }
    }
    diag('calendar:sync', { ...response.data })
  } catch (error) {
    logWarn('[calendar] sync failed', error)
  }
}
