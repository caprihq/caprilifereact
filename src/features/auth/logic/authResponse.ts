/**
 * Reading Base44's auth responses.
 *
 * Pure parsing, kept out of the services so it can be tested against captured
 * payloads without a network. The shapes are not fully documented, so each
 * reader is tolerant: an unexpected response degrades to "no token" rather than
 * throwing inside a sign-in.
 */

/** Keys Base44 has been observed to return a session under. */
const TOKEN_KEYS = ['access_token', 'token', 'accessToken'] as const

/** Flags that mean "we emailed a code, ask for it". */
const OTP_FLAGS = ['otp_required', 'requires_otp'] as const

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null

export const readToken = (response: unknown): string | null => {
  const record = asRecord(response)
  if (!record) return null

  for (const key of TOKEN_KEYS) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

export const needsOtp = (response: unknown): boolean => {
  const record = asRecord(response)
  if (!record) return false
  return OTP_FLAGS.some((flag) => record[flag] === true)
}

/**
 * How long the emailed code lasts.
 *
 * Observed on a real registration response as `otp_expires_in_minutes`. Feeds
 * the countdown, so the user is not left guessing whether a code is still good.
 */
export const readOtpExpiryMinutes = (response: unknown): number | undefined => {
  const record = asRecord(response)
  const value = record?.otp_expires_in_minutes
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

/**
 * Fields safe to print verbatim in diagnostics.
 *
 * `message` in particular states how the code was delivered and what shape it
 * takes — the thing you need when verification will not accept what was typed.
 * Everything else is reported as a key name only: a token must never be logged.
 */
const SAFE_TO_LOG = [
  'message',
  'otp_expires_in_minutes',
  'country_code',
  'otp_required',
  'requires_otp',
  'error',
  'detail',
] as const

/**
 * Base44's own explanation of what it just did — the field that says whether a
 * verification email was sent, or why one was not.
 */
export const readMessage = (response: unknown): string | undefined => {
  const record = asRecord(response)
  const message = record?.message
  return typeof message === 'string' && message.trim() ? message : undefined
}

/** A loggable summary: every key name, plus the values known to be safe. */
export const describeResponse = (response: unknown): Record<string, unknown> => {
  const record = asRecord(response)
  if (!record) return { type: typeof response }

  const summary: Record<string, unknown> = { keys: Object.keys(record).join(',') }

  for (const key of SAFE_TO_LOG) {
    const value = record[key]
    if (value !== undefined && asRecord(value) === null) summary[key] = value
  }
  // Presence only — the id itself identifies an account.
  if (typeof record.id === 'string') summary.hasId = true

  return summary
}
