import { appGroup } from '../../../../modules/capri-app-group'
import {
  LEGACY_WIDGET_TOKEN_KEY,
  WIDGET_SNAPSHOT_KEY,
} from '../../../../modules/capri-app-group/constants'
import { logWarn } from '@/utils'
import type { WidgetSnapshot } from '../logic/widgetSnapshot'

/**
 * Once per launch, not once per publish.
 *
 * The publisher runs whenever the visible tasks change, so an unguarded warning
 * would fill the log with the same line and bury whatever came next.
 */
let missingModuleReported = false

const warnOnceAboutMissingModule = (): void => {
  if (missingModuleReported) return
  missingModuleReported = true
  logWarn('[widget] CapriAppGroup native module is unavailable; the widget will not update')
}

/**
 * Hand the widget what the app is showing.
 *
 * The write and the reload are one action: storing a snapshot nobody is told about
 * would leave the home screen stale until WidgetKit's own half-hourly tick, which is
 * the staleness this whole design removes.
 *
 * A failure is logged rather than swallowed. The reload alone can fail quietly — a
 * widget is a courtesy — but a failed *write* is why a home screen would go stale,
 * and that has to be explainable rather than mysterious.
 */
export const publishWidgetSnapshot = async (snapshot: WidgetSnapshot): Promise<void> => {
  if (!appGroup) {
    // Said once, loudly, rather than returning in silence. A missing module makes
    // every home screen quietly stop updating with nothing anywhere to explain it,
    // which is the exact staleness this file exists to prevent — and it is what a
    // build against the wrong scheme produces, so it is not hypothetical.
    warnOnceAboutMissingModule()
    return
  }

  try {
    await appGroup.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch (error) {
    logWarn('[widget] could not publish the snapshot', error)
  }
}

/**
 * Wipe it on sign-out.
 *
 * Without this a signed-out phone keeps showing the previous user's tasks on its
 * home screen until something else overwrites them. The Capacitor app cleared its
 * token for the same reason.
 */
export const clearWidgetSnapshot = async (): Promise<void> => {
  if (!appGroup) return

  try {
    await appGroup.removeItem(WIDGET_SNAPSHOT_KEY)
  } catch (error) {
    logWarn('[widget] could not clear the snapshot', error)
  }
}

/** Ask WidgetKit to redraw without changing what it reads. */
export const reloadWidgets = async (): Promise<void> => {
  try {
    await appGroup?.reloadAll()
  } catch {
    // Nothing to recover: the widget is a courtesy, not part of any flow.
  }
}

/**
 * Remove the token the Capacitor app left in shared storage.
 *
 * Upgrading in place keeps the App Group container, so a phone that ran the old app
 * still holds its session token here — in plaintext, in a store that rides into
 * device backups, read by nothing since this widget uses the Keychain. Deleting it
 * is the last step of that migration.
 *
 * Idempotent and silent: on a device that never ran the old app there is nothing to
 * remove, which is not worth a log line.
 */
export const clearLegacyWidgetToken = async (): Promise<void> => {
  if (!appGroup) return

  try {
    await appGroup.removeItem(LEGACY_WIDGET_TOKEN_KEY)
  } catch {
    // Best effort. A failure leaves the old key where it already was.
  }
}
