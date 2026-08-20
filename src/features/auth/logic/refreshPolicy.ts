import { assertNever } from '@/utils'
import { isExpired, needsRefresh, parseToken } from './token'

/**
 * When to renew the session, as pure arithmetic.
 *
 * The decisions from web/src/lib/token-refresh.js, separated from the fetch it
 * was tangled with. Base44 issues one short-lived JWT and its SDK has no
 * refresh mechanism, so without this the app pushes people back to the login
 * screen every few hours.
 *
 * Everything here is a function of (token, clock). No storage, no network, no
 * timers (§2.3) — which is what finally makes the rules testable; the web
 * version could only be observed by watching a device log for hours.
 */

/** Renew once less than this much life remains. Base44 TTLs are hours. */
export const REFRESH_MARGIN_MS = 30 * 60 * 1000
/** Minimum gap between attempts; foreground events can arrive in bursts. */
export const ATTEMPT_THROTTLE_MS = 60 * 1000
/** Re-probe an endpoint that previously answered "unsupported". */
export const UNSUPPORTED_RETRY_MS = 7 * 24 * 60 * 60 * 1000
/** setTimeout is unreliable with very long delays; an extra no-op wake is free. */
export const MAX_TIMER_MS = 24 * 60 * 60 * 1000
/** Floor for the next wake, so a tight loop is impossible. */
export const MIN_TIMER_MS = 30 * 1000

export type RefreshDecision =
  /** No token, or no readable expiry — nothing useful to do. */
  | { readonly kind: 'idle' }
  /** The credential is already dead; re-run the auth check instead. */
  | { readonly kind: 'expired' }
  /** Still healthy. Come back in `delayMs`. */
  | { readonly kind: 'wait'; readonly delayMs: number }
  /** Inside the renewal window — ask the server for a new token. */
  | { readonly kind: 'attempt' }

export type PolicyContext = {
  readonly nowMs: number
  /** When the last attempt was made, or 0 if never. */
  readonly lastAttemptAtMs: number
  /** When the endpoint last reported unsupported, or 0/undefined if never. */
  readonly unsupportedAtMs?: number | undefined
}

export const isRefreshUnsupported = (
  unsupportedAtMs: number | undefined,
  nowMs: number,
): boolean => {
  if (!unsupportedAtMs) return false
  return nowMs - unsupportedAtMs < UNSUPPORTED_RETRY_MS
}

/**
 * How long until the next check. Aims at the start of the renewal window, never
 * sooner than `minDelayMs`, never longer than a day.
 */
export const nextTimerDelay = (
  token: string | null | undefined,
  nowMs: number,
  minDelayMs: number = MIN_TIMER_MS,
): number | null => {
  const expiresAt = parseToken(token)?.expiresAt
  if (expiresAt == null) return null
  const untilWindow = expiresAt - REFRESH_MARGIN_MS - nowMs
  return Math.min(Math.max(untilWindow, minDelayMs), MAX_TIMER_MS)
}

/** What to do right now. */
export const decideRefresh = (
  token: string | null | undefined,
  context: PolicyContext,
): RefreshDecision => {
  if (!token) return { kind: 'idle' }

  const { nowMs, lastAttemptAtMs, unsupportedAtMs } = context

  // Throttled, but never leave the watchdog un-armed.
  if (lastAttemptAtMs > 0 && nowMs - lastAttemptAtMs < ATTEMPT_THROTTLE_MS) {
    return { kind: 'wait', delayMs: ATTEMPT_THROTTLE_MS }
  }

  // A token whose expiry cannot be read is still worth presenting — the server
  // is the authority — so there is nothing to schedule against.
  if (parseToken(token)?.expiresAt == null) return { kind: 'idle' }

  // `isExpired` and `needsRefresh` already encode this arithmetic and are
  // tested; re-deriving it here would be a second copy to keep in step (§2.5).
  if (isExpired(token, nowMs)) return { kind: 'expired' }

  if (!needsRefresh(token, nowMs, REFRESH_MARGIN_MS)) {
    return { kind: 'wait', delayMs: nextTimerDelay(token, nowMs) ?? MIN_TIMER_MS }
  }

  if (isRefreshUnsupported(unsupportedAtMs, nowMs)) {
    return { kind: 'wait', delayMs: MAX_TIMER_MS }
  }

  return { kind: 'attempt' }
}

/**
 * Only adopt something strictly better than what we hold: a different token
 * whose expiry is genuinely later. Anything else means the endpoint is not
 * actually issuing tokens.
 */
export const isBetterToken = (
  candidate: string | null | undefined,
  current: string | null | undefined,
): boolean => {
  if (!candidate || candidate === current) return false
  const candidateExpiry = parseToken(candidate)?.expiresAt
  if (candidateExpiry == null) return false
  const currentExpiry = parseToken(current)?.expiresAt ?? 0
  return candidateExpiry > currentExpiry
}

/** Human-readable reason a cycle ran, for logs. */
export type RefreshTrigger = 'launch' | 'foreground' | 'timer'

export const describeTrigger = (trigger: RefreshTrigger): string => {
  switch (trigger) {
    case 'launch':
      return 'app launch'
    case 'foreground':
      return 'returned to foreground'
    case 'timer':
      return 'scheduled check'
    default:
      return assertNever(trigger)
  }
}
