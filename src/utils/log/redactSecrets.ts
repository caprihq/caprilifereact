import { describeError } from './errorDetail'

/**
 * Make a request or response body safe to print, then print it *whole*.
 *
 * The old `describeResponse` logged key **names** plus a small value whitelist.
 * That is the right default for a shipped app and useless for debugging: when
 * sign-up fails, the answer is usually in the very field that was withheld —
 * Base44's `message`. So this redacts the two things that must never appear and
 * keeps everything else verbatim.
 *
 * Rules:
 *   · passwords  → `<redacted len=N>`; the length is what catches a trailing
 *                  space or a truncated paste
 *   · tokens     → `len=…:first6…last4`, the same fingerprint used everywhere
 *   · everything else, including ids and messages, is kept
 *
 * Callers must gate on `__DEV__`. A release build must never print bodies.
 */

const PASSWORD_KEYS = /^(password|new_?password|current_?password|confirm_?password)$/i
const TOKEN_KEYS = /(^|_)(token|access_token|refresh_token|reset_?token|id_?token|jwt)$/i

const fingerprint = (value: string): string => {
  if (value.length <= 12) return `len=${String(value.length)}:<short>`
  return `len=${String(value.length)}:${value.slice(0, 6)}…${value.slice(-4)}`
}

/**
 * Already safe: a fingerprint, a redaction marker, or the absence of a value.
 *
 * Without this the redactor fingerprints its own output. `tokenFp(null)` returns
 * the string `"null"`, which came back out as `len=4:<short>` — a log that read
 * like a mysterious four-character token sitting in the Keychain when in fact
 * there was no session at all. It cost real debugging time.
 */
const ALREADY_SAFE = /^(len=\d+:|<redacted|null$|undefined$|\(none\)$)/

const redactValue = (key: string, value: unknown): unknown => {
  if (typeof value === 'string') {
    if (ALREADY_SAFE.test(value)) return value
    if (PASSWORD_KEYS.test(key)) return `<redacted len=${String(value.length)}>`
    if (TOKEN_KEYS.test(key)) return fingerprint(value)
  }
  return redactSecrets(value)
}

/**
 * True for anything a `catch` is likely to hold: an Error, an axios rejection, or
 * Base44's own flattened error.
 */
const isErrorLike = (value: unknown): boolean => {
  if (value instanceof Error) return true
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.message === 'string' && ('status' in record || 'response' in record)
}

/** Deep copy with secrets replaced. Arrays and nesting are preserved. */
export const redactSecrets = (input: unknown): unknown => {
  if (Array.isArray(input)) return input.map((item) => redactSecrets(item))
  if (typeof input !== 'object' || input === null) return input

  // Errors first, and this is the important case: their own properties are not
  // enumerable, so `JSON.stringify(new Error('boom'))` is `{}` — a log line that
  // says a failure happened and nothing about what it was. `describeError` pulls
  // out the message, status, method and URL, with the URL already redacted.
  if (isErrorLike(input)) return describeError(input)

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = redactValue(key, value)
  }
  return out
}

/**
 * Readable one-value-per-line JSON, so React Native DevTools shows text that can
 * be selected and pasted rather than a collapsed `Object`.
 */
export const stringifySafely = (input: unknown): string => {
  if (input === undefined) return ''
  // JSON.stringify answers `undefined` for these, though its type says string —
  // naming the type is more useful in a log than an empty line.
  if (typeof input === 'function' || typeof input === 'symbol') return `<${typeof input}>`
  try {
    return JSON.stringify(redactSecrets(input), null, 2)
  } catch {
    // Circular, or a value that will not serialise. Still say something useful.
    return `<unserialisable: ${Object.prototype.toString.call(input)}>`
  }
}
