import { describeError, redact, summarizeError } from './errorDetail'
import { stringifySafely } from './redactSecrets'

/**
 * Diagnostic logging for the auth and network path.
 *
 * Ported from web/src/lib/auth-diag.js, which existed for the same reason: one
 * consistent, greppable prefix so a single failed sign-in shows the whole flow
 * end to end, in order.
 *
 * Two rules carried over verbatim, because logs get shared:
 *   · a raw token is NEVER printed — only a fingerprint
 *   · URLs are redacted before they are logged
 *
 * Also the first step towards §5.3, which asks for a logger with levels that is
 * downgraded in release builds. `__DEV__` gates the chatty levels; failures are
 * always reported, because a release-only failure is the one you most need.
 */

const PREFIX = '[diag]'

/** Chatty output only while developing. Failures ignore this. */
const verbose = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__

/**
 * Safe token fingerprint. Distinguishes "missing" from "present but wrong"
 * without disclosing anything usable.
 */
export const tokenFp = (token: string | null | undefined): string => {
  if (!token) return String(token)
  if (token.length <= 12) return `len=${String(token.length)}:<short>`
  return `len=${String(token.length)}:${token.slice(0, 6)}…${token.slice(-4)}`
}

/**
 * A step happened. Never throws — logging must not break the flow it observes.
 *
 * Uses `console.warn` rather than `console.log` because the lint config permits
 * only warn and error (§5.3). That suits diagnostics anyway: warn is what shows
 * up prominently in Metro and `adb logcat` without extra filtering.
 */
export const diag = (step: string, data?: Record<string, unknown>): void => {
  if (!verbose()) return
  try {
    // Stringified rather than passed as an object. React Native DevTools renders
    // an object argument as a collapsed `Object`, which cannot be read at a
    // glance or copied out of the console — and a log nobody can read is not a
    // diagnostic.
    if (data === undefined) console.warn(`${PREFIX} ${step}`)
    else console.warn(`${PREFIX} ${step} ${stringifySafely(data)}`)
  } catch {
    /* ignore */
  }
}

/**
 * A step failed. Always logged, in both dev and release.
 *
 * Prints the summary first — "NEVER REACHED SERVER" vs "server answered 401" is
 * the fork every other question hangs off — then the structured detail.
 */
export const diagFailure = (step: string, error: unknown, context?: Record<string, unknown>): void => {
  try {
    const detail = describeError(error)
    console.warn(
      `${PREFIX} ${step} FAILED: ${summarizeError(detail)} ${stringifySafely({
        ...detail,
        ...(context ?? {}),
      })}`,
    )
  } catch {
    /* ignore */
  }
}

/**
 * The full request or response body of a backend call, printed whole.
 *
 * `diag` summarises; this shows everything except passwords and token values, so
 * a failing sign-up can be read rather than guessed at — Base44 explains itself in
 * a `message` field that the summary used to withhold.
 *
 * Dev only, and deliberately so: a release build must not print bodies.
 */
export const wire = (label: string, body: unknown): void => {
  if (!verbose()) return
  try {
    console.warn(`${PREFIX} [wire] ${label}\n${stringifySafely(body)}`)
  } catch {
    /* ignore */
  }
}

/**
 * A warning or an error, as a **string**.
 *
 * The only place in `src/` allowed to touch `console` — an ESLint rule enforces
 * it. Every other module went through `console.warn('[x] failed', error)`, which
 * React Native DevTools renders as `[x] failed Object`: unreadable, unselectable,
 * and useless in a pasted bug report. One argument, one line, values visible.
 *
 * `detail` may be an Error, a response body, or a plain object; secrets are
 * redacted and Errors are expanded on the way through.
 */
export const logWarn = (label: string, detail?: unknown): void => {
  try {
    console.warn(detail === undefined ? label : `${label} ${stringifySafely(detail)}`)
  } catch {
    /* ignore */
  }
}

/** As `logWarn`, for failures that deserve the error level. */
export const logError = (label: string, detail?: unknown): void => {
  try {
    console.error(detail === undefined ? label : `${label} ${stringifySafely(detail)}`)
  } catch {
    /* ignore */
  }
}

/** Log a URL with token values stripped. */
export const diagUrl = (step: string, url: string): void => {
  diag(step, { url: redact(url) })
}
