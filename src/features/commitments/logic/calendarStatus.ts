export type ConnectionState =
  | 'connected'
  | 'disconnected'
  | 'missing_permission'
  | 'auth_failed'
  | 'calendar_error'

const PROBLEMS: ReadonlySet<string> = new Set(['missing_permission', 'auth_failed', 'calendar_error'])

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null

/** Only a real list of events means connected. */
export const stateFromReply = (data: unknown): ConnectionState => {
  const reply = asRecord(data)
  if (!reply) return 'calendar_error'
  if (Array.isArray(reply.events)) return 'connected'
  if (typeof reply.problem === 'string' && PROBLEMS.has(reply.problem)) {
    return reply.problem as ConnectionState
  }
  if (reply.connected === false) return 'disconnected'
  return 'calendar_error'
}

/** Google's refusals are thrown, so read the backend's `problem` from the error. */
export const stateFromError = (error: unknown): ConnectionState => {
  const err = asRecord(error)
  const body = asRecord(err?.response)?.data ?? err?.data
  return body === undefined ? 'calendar_error' : stateFromReply(body)
}

/** States that prove sign-in finished, so the sheet can close. */
export const isLinkEvidence = (state: ConnectionState): boolean =>
  state === 'connected' || state === 'missing_permission'

/** The row's status line. */
export const statusLabel = (state: ConnectionState | 'checking'): string => {
  switch (state) {
    case 'checking':
      return 'Checking…'
    case 'connected':
      return 'Connected'
    case 'disconnected':
      return 'Not connected'
    case 'missing_permission':
      return 'Calendar access not granted'
    case 'auth_failed':
      return 'Sign-in expired'
    case 'calendar_error':
      return "Google Calendar isn't responding"
  }
}

/** What to tell someone when a connect attempt ends somewhere other than connected. */
export const messageFor = (state: ConnectionState): string | null => {
  switch (state) {
    case 'connected':
      return null
    case 'disconnected':
      return "Calendar wasn't connected. If Google warned that the app isn't verified, choose Advanced then Continue to finish linking."
    case 'missing_permission':
      return "Google linked your account but didn't give CAPRI calendar access. Tap Reconnect and tick every Calendar box on Google's screen."
    case 'auth_failed':
      return 'Google no longer accepts the saved sign-in. Tap Reconnect to sign in again.'
    case 'calendar_error':
      return "Google Calendar didn't respond. Please try again in a moment."
  }
}

/** A linked-but-broken calendar is fixed by signing in again, not by disconnecting. */
export const needsReconnect = (state: ConnectionState | 'checking'): boolean =>
  state === 'missing_permission' || state === 'auth_failed' || state === 'calendar_error'
