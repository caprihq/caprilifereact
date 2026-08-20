import {
  MAX_CODE_LENGTH,
  MIN_SUBMITTABLE_LENGTH,
  RESEND_COOLDOWN_MS,
  canResend,
  formatCountdown,
  isCodeSubmittable,
  isOtpExpired,
  normalizeCode,
  otpExpiresAt,
  otpRemainingMs,
  resendCooldownRemainingMs,
} from './otpPolicy'

const NOW = 1_800_000_000_000
const MINUTE = 60_000

describe('otpExpiresAt', () => {
  it('adds the minutes Base44 reported', () => {
    expect(otpExpiresAt(NOW, 10)).toBe(NOW + 10 * MINUTE)
  })

  it('is null when Base44 sent no expiry, so the UI shows no countdown', () => {
    expect(otpExpiresAt(NOW, undefined)).toBeNull()
    expect(otpExpiresAt(NOW, 0)).toBeNull()
    expect(otpExpiresAt(NOW, Number.NaN)).toBeNull()
  })
})

describe('otpRemainingMs', () => {
  it('counts down and never goes negative', () => {
    const expiry = otpExpiresAt(NOW, 5)
    expect(otpRemainingMs(expiry, NOW)).toBe(5 * MINUTE)
    expect(otpRemainingMs(expiry, NOW + 4 * MINUTE)).toBe(MINUTE)
    expect(otpRemainingMs(expiry, NOW + 99 * MINUTE)).toBe(0)
  })

  it('is null without a known deadline', () => {
    expect(otpRemainingMs(null, NOW)).toBeNull()
  })
})

describe('isOtpExpired', () => {
  it('is false while time remains and true once it does not', () => {
    const expiry = otpExpiresAt(NOW, 1)
    expect(isOtpExpired(expiry, NOW)).toBe(false)
    expect(isOtpExpired(expiry, NOW + MINUTE)).toBe(true)
  })

  it('is never expired when there is no deadline', () => {
    expect(isOtpExpired(null, NOW)).toBe(false)
  })
})

describe('formatCountdown', () => {
  it('pads seconds', () => {
    expect(formatCountdown(9 * 1000)).toBe('0:09')
    expect(formatCountdown(65 * 1000)).toBe('1:05')
    expect(formatCountdown(10 * MINUTE)).toBe('10:00')
  })

  it('floors rather than rounds, so it never shows the next second early', () => {
    expect(formatCountdown(1999)).toBe('0:01')
  })

  it('clamps negatives to zero', () => {
    expect(formatCountdown(-5000)).toBe('0:00')
  })
})

describe('resend cooldown', () => {
  it('is immediately available before anything has been sent', () => {
    expect(canResend(null, NOW)).toBe(true)
    expect(resendCooldownRemainingMs(null, NOW)).toBe(0)
  })

  it('blocks the double-tap that otherwise earns a 429', () => {
    expect(canResend(NOW, NOW + 1000)).toBe(false)
    expect(resendCooldownRemainingMs(NOW, NOW + 1000)).toBe(RESEND_COOLDOWN_MS - 1000)
  })

  it('reopens exactly at the boundary', () => {
    expect(canResend(NOW, NOW + RESEND_COOLDOWN_MS)).toBe(true)
  })
})

describe('code input', () => {
  it('keeps digits only and caps the length', () => {
    expect(normalizeCode('12ab34')).toBe('1234')
    expect(normalizeCode('1'.repeat(50))).toHaveLength(MAX_CODE_LENGTH)
    expect(normalizeCode('  1 2-3  ')).toBe('123')
  })

  it('allows submitting from the minimum length up, not only at exactly six', () => {
    // The old exact-length gate stranded users with a greyed-out Verify button
    // and no error whenever the code was not precisely six digits.
    expect(isCodeSubmittable('1'.repeat(MIN_SUBMITTABLE_LENGTH - 1))).toBe(false)
    expect(isCodeSubmittable('1'.repeat(MIN_SUBMITTABLE_LENGTH))).toBe(true)
    expect(isCodeSubmittable('123456')).toBe(true)
  })

  it('judges submittability on digits, not raw input length', () => {
    expect(isCodeSubmittable('ab12')).toBe(false)
  })
})
