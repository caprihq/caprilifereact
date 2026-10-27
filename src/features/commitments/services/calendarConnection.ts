import InAppBrowser from 'react-native-inappbrowser-reborn'

import { base44 } from '@/services/api'
import { diag, diagFailure, diagUrl, friendlyMessage, logWarn } from '@/utils'
import {
  isLinkEvidence,
  messageFor,
  stateFromError,
  stateFromReply,
} from '../logic/calendarStatus'
import type { ConnectionState } from '../logic/calendarStatus'

export type { ConnectionState } from '../logic/calendarStatus'

/** From web/src/components/integrations/CalendarIntegrationsSection.jsx. */
export const GOOGLE_CALENDAR_CONNECTOR_ID = '69ce9aafaf41384670cc5565'

export const checkCalendarConnection = async (): Promise<ConnectionState> => {
  try {
    const response = (await base44.functions.invoke('getUserCalendarEvents', {})) as {
      data?: unknown
    }
    return stateFromReply(response.data)
  } catch (error) {
    const state = stateFromError(error)
    diagFailure('calendar.check', error, { state })
    logWarn('[calendar] connection check failed', error)
    return state
  }
}

export type ConnectOutcome =
  | { readonly kind: 'finished'; readonly state: ConnectionState }
  | {
      readonly kind: 'failed'
      readonly message: string
      readonly state?: ConnectionState
    }

/** Kept for callers that only need the not-linked wording. */
export const NOT_LINKED_MESSAGE = messageFor('disconnected') ?? ''

/** How often to ask whether the link exists while the sign-in sheet is open. */
export const WATCH_INTERVAL_MS = 2500
/** Stop asking after this long; the user can still close the sheet themselves. */
export const WATCH_LIMIT_MS = 5 * 60_000

/**
 * Close the sign-in sheet once sign-in finishes. Base44's callback page can't close
 * itself in an in-app browser. Only a change from the first check closes it.
 */
export const closeWhenConnected = (): (() => void) => {
  let stopped = false
  let checking = false
  let baseline: ConnectionState | null = null
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
        // Every answer, so a sheet that never closes shows *which* state kept it open.
        diag('calendar.watch', { state, baseline })
        if (baseline === null) {
          baseline = state
          return
        }
        if (state !== baseline && isLinkEvidence(state)) {
          stop()
          InAppBrowser.close()
        }
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
      return {
        kind: 'failed',
        message: "Couldn't start the calendar connection. Please try again.",
      }
    }

    // Shows the client_id, redirect_uri and scopes Base44 actually sends to Google.
    diagUrl('calendar.authorize', url)

    if (!(await InAppBrowser.isAvailable())) {
      return {
        kind: 'failed',
        message: 'Connecting a calendar needs a browser, and none is available on this device.',
      }
    }

    const stopWatching = closeWhenConnected()
    try {
      await InAppBrowser.open(url)
    } finally {
      stopWatching()
    }

    const state = await checkCalendarConnection()
    diag('calendar.after-signin', { state })
    const message = messageFor(state)
    return message ? { kind: 'failed', message, state } : { kind: 'finished', state }
  } catch (error) {
    diagFailure('calendar.connect', error, { connector: GOOGLE_CALENDAR_CONNECTOR_ID })
    logWarn('[calendar] connect failed', error)
    return {
      kind: 'failed',
      message: friendlyMessage(error, "Couldn't connect your calendar. Please try again."),
    }
  }
}

/** Drop the existing grant first: Google keeps its old scopes until it is removed. */
export const reconnectCalendar = async (): Promise<ConnectOutcome> => {
  try {
    await base44.connectors.disconnectAppUser(GOOGLE_CALENDAR_CONNECTOR_ID)
  } catch (error) {
    logWarn('[calendar] disconnect before reconnect failed', error)
  }
  return connectCalendar()
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
