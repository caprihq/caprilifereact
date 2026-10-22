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

/**
 * Sync once a save has landed on the server.
 *
 * The sweep reads the server's copy of the tasks, so it must run after the write,
 * not beside it — fired alongside an optimistic update it could finish first and
 * sync nothing. Chained on the save's promise rather than a per-call `onSuccess`,
 * because React Query drops those when the screen that started the save unmounts,
 * which is exactly what happens when someone accepts the last suggestion and closes.
 *
 * A failed save is already reported to the user by the mutation; this only notes
 * that the sync was skipped because of it.
 */
export const syncAfter = (save: Promise<unknown>): void => {
  save.then(
    () => syncTasksToCalendar(),
    (error: unknown) => logWarn('[calendar] save failed, sync skipped', error),
  )
}
