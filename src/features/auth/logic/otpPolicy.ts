/**
 * Verification-code timing rules.
 *
 * Base44 returns `otp_expires_in_minutes` when it sends a code, and the app was
 * throwing that away — the user saw no deadline and no feedback after tapping
 * Resend, so the usual response to "nothing happened" is to tap it repeatedly
 * until Base44 rate-limits them with a 429.
 *
 * Pure: the clock is always an argument. Nothing here reads Date.now().
 */

/** What Base44 sends today. The screen accepts a range rather than assuming it. */
export const EXPECTED_CODE_LENGTH = 6
/**
 * Submit is allowed from this length up, rather than only at exactly the
 * expected length. An exact-length gate meant that if Base44 ever changed the
 * code length, Verify could never be pressed and the user was stranded with no
 * error — which is precisely what happened.
 */
export const MIN_SUBMITTABLE_LENGTH = 4
export const MAX_CODE_LENGTH = 10

/** Long enough to stop double-taps, short enough not to strand a lost email. */
export const RESEND_COOLDOWN_MS = 30_000

const MINUTE_MS = 60_000

/** When a code sent at `sentAtMs` stops being valid. */
export const otpExpiresAt = (sentAtMs: number, expiresInMinutes: number | undefined): number | null => {
  if (expiresInMinutes === undefined || !Number.isFinite(expiresInMinutes)) return null
  if (expiresInMinutes <= 0) return null
  return sentAtMs + expiresInMinutes * MINUTE_MS
}

/** Milliseconds left, never negative. Null when there is no known deadline. */
export const otpRemainingMs = (expiresAtMs: number | null, nowMs: number): number | null => {
  if (expiresAtMs === null) return null
  return Math.max(0, expiresAtMs - nowMs)
}

export const isOtpExpired = (expiresAtMs: number | null, nowMs: number): boolean => {
  const remaining = otpRemainingMs(expiresAtMs, nowMs)
  return remaining !== null && remaining === 0
}

/** `m:ss`, floored — a countdown should never show the next second early. */
export const formatCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.floor(Math.max(0, remainingMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes)}:${seconds.toString().padStart(2, '0')}`
}

/** Milliseconds until Resend becomes available again. Zero when it is ready. */
export const resendCooldownRemainingMs = (
  lastSentAtMs: number | null,
  nowMs: number,
  cooldownMs: number = RESEND_COOLDOWN_MS,
): number => {
  if (lastSentAtMs === null) return 0
  return Math.max(0, lastSentAtMs + cooldownMs - nowMs)
}

export const canResend = (lastSentAtMs: number | null, nowMs: number): boolean =>
  resendCooldownRemainingMs(lastSentAtMs, nowMs) === 0

/** Digits only, capped. Mirrors what the input should keep. */
export const normalizeCode = (input: string): string =>
  input.replace(/\D/g, '').slice(0, MAX_CODE_LENGTH)

export const isCodeSubmittable = (code: string): boolean =>
  normalizeCode(code).length >= MIN_SUBMITTABLE_LENGTH
