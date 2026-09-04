import { describeError } from './log/errorDetail'

/**
 * Any failure → a sentence written for the person holding the phone.
 *
 * The app used to hand `error.message` straight to a toast or a full-screen error in
 * several places, so what a user actually saw was whatever the SDK, the transport or
 * the store happened to say: "Request failed with status code 500", "Network request
 * failed", "Unknown product: capri_executive_monthly". Those are notes to a developer
 * who has the stack trace open. They tell a user nothing, and they read as if the app
 * had come apart.
 *
 * The rule here is that **server text is never shown**. What the server says is for
 * the log; what the user reads is one of the sentences below, chosen by the shape of
 * the failure, with a caller-supplied fallback for anything unrecognised. The
 * fallback is required rather than defaulted, so every call site has to decide what
 * its own failure means — a generic "Something went wrong" is not a decision.
 *
 * Auth keeps its own mapper (`features/auth/logic/authErrors.ts`): sign-in has copy
 * this cannot share, such as answering 401 and 403 identically so that nobody can
 * discover which email addresses have accounts.
 *
 * Pure, and here beside `describeError` rather than in a feature, because every
 * layer needs it (§3.5).
 */

const OFFLINE = 'You appear to be offline. Check your connection and try again.'
const UNAVAILABLE = 'CAPRI is unavailable right now. Please try again shortly.'
const SIGNED_OUT = 'Your session has ended. Please sign in again.'
const TOO_MANY = 'That was a lot at once. Please wait a moment and try again.'

/** Statuses with copy that is true whatever the caller was doing. */
const BY_STATUS: Record<number, string> = {
  401: SIGNED_OUT,
  403: 'Your plan does not include that.',
  408: 'That took too long. Please try again.',
  429: TOO_MANY,
}

export const friendlyMessage = (error: unknown, fallback: string): string => {
  const detail = describeError(error)

  // Never left the device: nothing the caller was attempting is relevant yet.
  if (!detail.reachedServer) return OFFLINE

  const { status } = detail
  if (status === undefined) return fallback

  const known = BY_STATUS[status]
  if (known) return known

  // Any 5xx is an outage, whatever its number and whatever the body says.
  if (status >= 500) return UNAVAILABLE

  return fallback
}
