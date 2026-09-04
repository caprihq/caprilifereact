import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { base44, queryKeys } from '@/services/api'
import { mmkvPrefStore } from '@/services/storage'
import { diag, logWarn } from '@/utils'

/**
 * Copy the user's next 48 hours of meetings into CAPRI.
 *
 * **This is what makes reminders cover meetings and not just typed tasks.** The
 * reminder sweep runs on a cron, and a cron has no signed-in user, so the backend
 * can never read anyone's calendar on its own — Google's token is issued to the user
 * making a request. The import has to happen while the user is here, and the sweep
 * then works from the rows it leaves behind.
 *
 * The consequence, stated plainly: someone who does not open CAPRI for two days gets
 * no reminders for meetings added in the meantime. Closing that needs a stored
 * refresh token on the backend, which is a larger change than this one.
 *
 * Throttled, because it writes: opening Home should not re-import a calendar that
 * was read four minutes ago.
 */

const LAST_IMPORT_KEY = 'capri.calendar.lastImportMs'
const THROTTLE_MS = 15 * 60 * 1000

const lastImportMs = (): number =>
  Number.parseInt(mmkvPrefStore.getString(LAST_IMPORT_KEY) ?? '0', 10) || 0

export const importCalendarEvents = async (nowMs: number): Promise<boolean> => {
  if (nowMs - lastImportMs() < THROTTLE_MS) return false

  // Written before the call, not after: a request that hangs must not be retried on
  // every render, and a failed import is not worth hammering.
  mmkvPrefStore.setString(LAST_IMPORT_KEY, String(nowMs))

  const response = (await base44.functions.invoke('importCalendarEvents', {})) as {
    data?: { connected?: boolean; imported?: number; updated?: number; removed?: number }
  }

  diag('calendar:import', { ...response.data })
  return (response.data?.imported ?? 0) + (response.data?.removed ?? 0) > 0
}

/**
 * Run the import when the calendar is available, and refresh commitments if it
 * changed anything.
 *
 * Failure is silent by design: the import is an optimisation of what the user can
 * already see, and a toast about a background sync is noise.
 */
export const useCalendarImport = (enabled: boolean, userEmail: string | null): void => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !userEmail) return

    void importCalendarEvents(Date.now())
      .then(async (changed) => {
        if (changed) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.commitments(userEmail) })
        }
      })
      .catch((error: unknown) => {
        logWarn('[calendar] import failed', error)
      })
  }, [enabled, userEmail, queryClient])
}
