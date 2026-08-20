import { describeError } from '@/utils'

/**
 * Base44 auth failures → something a person can act on.
 *
 * Extracted from `emailAuth.toMessage`, which was untested and could only be
 * exercised by provoking real server errors. It is the layer that decides what a
 * user is told when sign-in fails, so it is worth testing directly.
 *
 * Built on `describeError`, which already distinguishes "never reached the
 * server" from "the server refused" — a distinction that matters here, because
 * offline and wrong-password need completely different wording.
 */

/** Shown when the request never left the device. */
const OFFLINE = 'Could not reach CAPRI. Check your connection and try again.'

/**
 * Status → copy. Deliberately vague on 401/403 for sign-in: confirming that an
 * email exists but the password is wrong lets anyone enumerate accounts.
 */
const BY_STATUS: Record<number, string> = {
  400: 'That request was not accepted. Please check the details and try again.',
  401: 'Incorrect email or password.',
  403: 'Incorrect email or password.',
  404: 'No CAPRI account found for that email.',
  409: 'An account with that email already exists.',
  410: 'That link has expired. Request a new one.',
  422: 'Those details were not accepted. Please check them and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
}

/**
 * A server message worth showing.
 *
 * Only for the statuses where Base44 explains a validation problem in words the
 * user can act on ("password too short"). At other statuses its text is
 * internal, and echoing it leaks implementation detail.
 */
const SAFE_TO_SURFACE = new Set([400, 422])

const messageFromBody = (body: string | undefined): string | undefined => {
  if (!body) return undefined
  try {
    const parsed: unknown = JSON.parse(body)
    if (typeof parsed !== 'object' || parsed === null) return undefined
    const { message, detail } = parsed as { message?: unknown; detail?: unknown }
    if (typeof message === 'string' && message.trim()) return message
    if (typeof detail === 'string' && detail.trim()) return detail
    return undefined
  } catch {
    // Not JSON. A raw string body is as likely to be HTML as prose, so it is
    // not shown.
    return undefined
  }
}

/**
 * Did the server refuse because the address is registered but unverified?
 *
 * Base44 answers sign-in for such an account with
 * `400 "Please verify your email before logging in. Check your email for the
 * verification code."` — which the app used to render as flat error text, leaving
 * the user stranded: they had an account, no code, and no way forward. It is not a
 * credentials failure, it is an unfinished registration, so it routes to the OTP
 * screen instead.
 *
 * Matched on the wording because Base44 gives no code or flag to distinguish it
 * from a wrong password, which shares the same 400.
 */
export const isEmailUnverified = (error: unknown): boolean => {
  const detail = describeError(error)
  if (!detail.reachedServer) return false
  if (detail.status !== 400 && detail.status !== 403) return false

  const text = `${detail.message} ${messageFromBody(detail.body) ?? ''}`.toLowerCase()
  return text.includes('verify your email') || text.includes('email not verified')
}

/**
 * @param error   whatever the SDK threw
 * @param fallback wording for a failure we have no specific copy for
 */
export const authErrorMessage = (error: unknown, fallback: string): string => {
  const detail = describeError(error)

  if (!detail.reachedServer) return OFFLINE

  const { status } = detail
  if (status === undefined) return fallback

  if (SAFE_TO_SURFACE.has(status)) {
    const fromBody = messageFromBody(detail.body)
    if (fromBody) return fromBody
  }

  const known = BY_STATUS[status]
  if (known) return known

  // Any other 5xx is an outage, whatever its number.
  if (status >= 500) return 'CAPRI is unavailable right now. Please try again shortly.'

  return fallback
}

/**
 * True when retrying could plausibly succeed without the user changing
 * anything — offline or a server fault, as opposed to a wrong password.
 * Lets a screen offer "Try again" only where it makes sense.
 */
export const isRetryable = (error: unknown): boolean => {
  const detail = describeError(error)
  if (!detail.reachedServer) return true
  return detail.status !== undefined && detail.status >= 500
}
