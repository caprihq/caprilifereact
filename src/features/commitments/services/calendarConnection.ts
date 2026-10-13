import InAppBrowser from 'react-native-inappbrowser-reborn'

import { base44 } from '@/services/api'
import { diagFailure, friendlyMessage, logWarn } from '@/utils'

/**
 * Linking the user's Google Calendar.
 *
 * The web version opened `connectAppUser`'s URL with `window.open` and polled
 * every 500ms for `popup.closed` to know when to re-check. There is no popup on
 * a phone: `InAppBrowser.open` resolves when the sheet is dismissed, so the
 * re-check happens on a real signal instead of a timer.
 *
 * Every function returns a value rather than throwing — a connector that is
 * simply not linked is the normal state, not an error (§2.6, §5.1).
 */

/** From web/src/components/integrations/CalendarIntegrationsSection.jsx. */
export const GOOGLE_CALENDAR_CONNECTOR_ID = '69ce9aafaf41384670cc5565'

export type ConnectionState = 'connected' | 'disconnected'

/**
 * Ask the backend whether a calendar is reachable.
 *
 * Connected means one thing: the backend came back with a list of events. It
 * answers `{ events: null, connected: false }` when nothing is linked, `{ events }`
 * when it is, and `{ error }` when Google refuses the token — a box left unticked
 * on the consent screen, an expired grant.
 *
 * This used to call anything that was not explicitly "not connected" connected, so
 * an error reply counted as success. That was tolerable while the check ran once,
 * after the user closed the browser. It is not now that a poll closes the sign-in
 * sheet on a "connected": a refused token would shut the sheet and report a link
 * that does not work.
 */
export const isConnectedReply = (data: unknown): boolean =>
  typeof data === 'object' &&
  data !== null &&
  Array.isArray((data as { events?: unknown }).events)

export const checkCalendarConnection = async (): Promise<ConnectionState> => {
  try {
    const response = (await base44.functions.invoke('getUserCalendarEvents', {})) as {
      data?: unknown
    }
    return isConnectedReply(response.data) ? 'connected' : 'disconnected'
  } catch (error) {
    diagFailure('calendar.check', error)
    logWarn('[calendar] connection check failed', error)
    return 'disconnected'
  }
}

export type ConnectOutcome =
  | { readonly kind: 'finished'; readonly state: ConnectionState }
  | { readonly kind: 'failed'; readonly message: string }

/**
 * Said when the browser closes with nothing linked.
 *
 * Previously this path was silent: the sheet shut, the row stayed "Not connected",
 * and nothing explained why. The commonest reason is not a fault in CAPRI at all —
 * Google interrupts the flow with "Google hasn't verified this app" whenever the
 * OAuth consent screen is still in testing, and the safe-looking button on that
 * screen is the one that abandons the connection. Naming it is the difference
 * between a user retrying successfully and concluding the feature is broken.
 */
export const NOT_LINKED_MESSAGE =
  "Calendar wasn't connected. If Google warned that the app isn't verified, choose Advanced then Continue to finish linking."


/** How often to ask whether the link exists while the sign-in sheet is open. */
export const WATCH_INTERVAL_MS = 2500
/** Stop asking after this long; the user can still close the sheet themselves. */
export const WATCH_LIMIT_MS = 5 * 60_000

/**
 * Close the sign-in sheet as soon as the calendar becomes linked.
 *
 * Base44's connector flow was written for the web app, where it runs in a popup and
 * the final callback page closes that popup. In the phone's in-app browser there is
 * no popup to close, so after Google's "Continue" the finished page simply sat there
 * looking like it was still loading — the connection had succeeded, but nothing told
 * the user, and nothing ran until they dismissed the sheet by hand.
 *
 * Polling the backend is the one signal that does not depend on what that page does.
 * Three rules keep it from closing the sheet at the wrong moment:
 *
 * - **It needs to see the change.** Only "not linked, then linked" closes the sheet.
 *   Someone reconnecting an account that is already linked would otherwise have the
 *   sheet shut on the first check, before they could sign in at all; for them this
 *   simply stands down and they close it themselves.
 * - **The first check runs immediately**, as the sheet opens, so that baseline is
 *   taken before anyone could possibly have finished signing in.
 * - **Checks never overlap**, and one that lands after the sheet has closed does
 *   nothing.
 *
 * Returns a stop function.
 */
export const closeWhenConnected = (): (() => void) => {
  let stopped = false
  let checking = false
  let sawUnlinked = false
  const startedAt = Date.now()

  const stop = (): void => {
    stopped = true
    clearInterval(timer)
  }

  const check = (): void => {
    if (stopped || checking) return
    if (Date.now() - startedAt > WATCH_LIMIT_MS) {
      stop()
      return
    }
    checking = true
    void checkCalendarConnection()
      .then((state) => {
        if (stopped) return
        if (state === 'disconnected') {
          sawUnlinked = true
          return
        }
        // Linked from the very first look: nothing to detect, so stand down.
        stop()
        if (sawUnlinked) InAppBrowser.close()
      })
      .finally(() => {
        checking = false
      })
  }

  const timer = setInterval(check, WATCH_INTERVAL_MS)
  check()

  return stop
}

export const connectCalendar = async (): Promise<ConnectOutcome> => {
  try {
    const url: unknown = await base44.connectors.connectAppUser(GOOGLE_CALENDAR_CONNECTOR_ID)
    if (typeof url !== 'string' || !url) {
      return { kind: 'failed', message: "Couldn't start the calendar connection. Please try again." }
    }

    if (!(await InAppBrowser.isAvailable())) {
      return {
        kind: 'failed',
        message: 'Connecting a calendar needs a browser, and none is available on this device.',
      }
    }

    // Resolves once the browser is dismissed — by the user, or by the watcher below
    // the moment the connection exists.
    const stopWatching = closeWhenConnected()
    try {
      await InAppBrowser.open(url)
    } finally {
      stopWatching()
    }

    const state = await checkCalendarConnection()
    if (state === 'disconnected') {
      return { kind: 'failed', message: NOT_LINKED_MESSAGE }
    }

    return { kind: 'finished', state }
  } catch (error) {
    // Printed in release too, so a tester's console says whether the connector
    // refused to start the flow or the callback never completed.
    diagFailure('calendar.connect', error, { connector: GOOGLE_CALENDAR_CONNECTOR_ID })
    logWarn('[calendar] connect failed', error)
    return {
      kind: 'failed',
      message: friendlyMessage(error, "Couldn't connect your calendar. Please try again."),
    }
  }
}

export const disconnectCalendar = async (): Promise<ConnectOutcome> => {
  try {
    await base44.connectors.disconnectAppUser(GOOGLE_CALENDAR_CONNECTOR_ID)
    return { kind: 'finished', state: 'disconnected' }
  } catch (error) {
    logWarn('[calendar] disconnect failed', error)
    return {
      kind: 'failed',
      message: friendlyMessage(error, "Couldn't disconnect your calendar. Please try again."),
    }
  }
}
