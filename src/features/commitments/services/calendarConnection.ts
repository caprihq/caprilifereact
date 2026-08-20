import InAppBrowser from 'react-native-inappbrowser-reborn'

import { base44 } from '@/services/api'
import { logWarn } from '@/utils'

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
 * `getUserCalendarEvents` answers `{ events: null, connected: false }` when
 * there is no connection, so a missing link is a successful response.
 */
export const checkCalendarConnection = async (): Promise<ConnectionState> => {
  try {
    const response = (await base44.functions.invoke('getUserCalendarEvents', {})) as {
      data?: { events?: unknown; connected?: boolean }
    }
    const { events, connected } = response.data ?? {}
    return events !== null && connected !== false ? 'connected' : 'disconnected'
  } catch (error) {
    logWarn('[calendar] connection check failed', error)
    return 'disconnected'
  }
}

export type ConnectOutcome =
  | { readonly kind: 'finished'; readonly state: ConnectionState }
  | { readonly kind: 'failed'; readonly message: string }

export const connectCalendar = async (): Promise<ConnectOutcome> => {
  try {
    const url: unknown = await base44.connectors.connectAppUser(GOOGLE_CALENDAR_CONNECTOR_ID)
    if (typeof url !== 'string' || !url) {
      return { kind: 'failed', message: 'CAPRI could not start the calendar connection.' }
    }

    if (!(await InAppBrowser.isAvailable())) {
      return { kind: 'failed', message: 'No browser is available to complete the connection.' }
    }

    // Resolves once the user dismisses the browser, however it ended.
    await InAppBrowser.open(url)

    return { kind: 'finished', state: await checkCalendarConnection() }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not connect your calendar.'
    logWarn('[calendar] connect failed', error)
    return { kind: 'failed', message }
  }
}

export const disconnectCalendar = async (): Promise<ConnectOutcome> => {
  try {
    await base44.connectors.disconnectAppUser(GOOGLE_CALENDAR_CONNECTOR_ID)
    return { kind: 'finished', state: 'disconnected' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not disconnect your calendar.'
    logWarn('[calendar] disconnect failed', error)
    return { kind: 'failed', message }
  }
}
