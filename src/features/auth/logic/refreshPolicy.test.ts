import {
  ATTEMPT_THROTTLE_MS,
  MAX_TIMER_MS,
  MIN_TIMER_MS,
  REFRESH_MARGIN_MS,
  UNSUPPORTED_RETRY_MS,
  decideRefresh,
  describeTrigger,
  isBetterToken,
  isRefreshUnsupported,
  nextTimerDelay,
} from './refreshPolicy'

const NOW = 1_800_000_000_000

/** A JWT-shaped string whose payload carries only `exp`. Signature unused. */
const tokenExpiringAt = (expiryMs: number, salt = 'a'): string => {
  const payload = JSON.stringify({ exp: Math.floor(expiryMs / 1000), salt })
  const body = Buffer.from(payload, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${body}.signature`
}

const fresh = { nowMs: NOW, lastAttemptAtMs: 0 }

describe('decideRefresh', () => {
  it('is idle with no token', () => {
    expect(decideRefresh(null, fresh)).toEqual({ kind: 'idle' })
    expect(decideRefresh(undefined, fresh)).toEqual({ kind: 'idle' })
  })

  it('is idle when the expiry cannot be read', () => {
    // A token we cannot read is still worth presenting; the server decides.
    expect(decideRefresh('not-a-jwt', fresh)).toEqual({ kind: 'idle' })
  })

  it('reports expired once the token is dead', () => {
    expect(decideRefresh(tokenExpiringAt(NOW - 1000), fresh)).toEqual({ kind: 'expired' })
  })

  it('waits while there is plenty of life left', () => {
    const token = tokenExpiringAt(NOW + 4 * REFRESH_MARGIN_MS)
    const decision = decideRefresh(token, fresh)
    expect(decision.kind).toBe('wait')
  })

  it('attempts once inside the renewal window', () => {
    const token = tokenExpiringAt(NOW + REFRESH_MARGIN_MS - 60_000)
    expect(decideRefresh(token, fresh)).toEqual({ kind: 'attempt' })
  })

  it('throttles bursts of foreground events', () => {
    const token = tokenExpiringAt(NOW + REFRESH_MARGIN_MS - 60_000)
    const decision = decideRefresh(token, {
      nowMs: NOW,
      lastAttemptAtMs: NOW - 1000,
    })
    expect(decision).toEqual({ kind: 'wait', delayMs: ATTEMPT_THROTTLE_MS })
  })

  it('stops asking an endpoint that said unsupported, and re-probes after a week', () => {
    const token = tokenExpiringAt(NOW + REFRESH_MARGIN_MS - 60_000)

    expect(
      decideRefresh(token, { nowMs: NOW, lastAttemptAtMs: 0, unsupportedAtMs: NOW - 1000 }).kind,
    ).toBe('wait')

    expect(
      decideRefresh(token, {
        nowMs: NOW,
        lastAttemptAtMs: 0,
        unsupportedAtMs: NOW - UNSUPPORTED_RETRY_MS - 1,
      }),
    ).toEqual({ kind: 'attempt' })
  })

  it('still routes an expired token to expired even when refresh is unsupported', () => {
    const decision = decideRefresh(tokenExpiringAt(NOW - 1), {
      nowMs: NOW,
      lastAttemptAtMs: 0,
      unsupportedAtMs: NOW,
    })
    expect(decision).toEqual({ kind: 'expired' })
  })
})

describe('isRefreshUnsupported', () => {
  it('is false when never marked', () => {
    expect(isRefreshUnsupported(undefined, NOW)).toBe(false)
    expect(isRefreshUnsupported(0, NOW)).toBe(false)
  })

  it('expires the flag after the retry window', () => {
    expect(isRefreshUnsupported(NOW - 1000, NOW)).toBe(true)
    expect(isRefreshUnsupported(NOW - UNSUPPORTED_RETRY_MS - 1, NOW)).toBe(false)
  })
})

describe('nextTimerDelay', () => {
  it('is null when there is no readable expiry', () => {
    expect(nextTimerDelay(null, NOW)).toBeNull()
    expect(nextTimerDelay('not-a-jwt', NOW)).toBeNull()
  })

  it('aims at the start of the renewal window', () => {
    const token = tokenExpiringAt(NOW + REFRESH_MARGIN_MS + 10 * 60_000)
    expect(nextTimerDelay(token, NOW)).toBe(10 * 60_000)
  })

  it('never returns less than the floor, even for an expired token', () => {
    expect(nextTimerDelay(tokenExpiringAt(NOW - 10_000), NOW)).toBe(MIN_TIMER_MS)
  })

  it('caps very distant expiries at a day', () => {
    const token = tokenExpiringAt(NOW + 30 * MAX_TIMER_MS)
    expect(nextTimerDelay(token, NOW)).toBe(MAX_TIMER_MS)
  })
})

describe('isBetterToken', () => {
  const current = tokenExpiringAt(NOW + 60_000, 'current')

  it('rejects a missing or identical candidate', () => {
    expect(isBetterToken(null, current)).toBe(false)
    expect(isBetterToken(current, current)).toBe(false)
  })

  it('rejects a candidate with no readable expiry', () => {
    expect(isBetterToken('not-a-jwt', current)).toBe(false)
  })

  it('rejects a candidate that expires no later', () => {
    expect(isBetterToken(tokenExpiringAt(NOW + 60_000, 'other'), current)).toBe(false)
    expect(isBetterToken(tokenExpiringAt(NOW + 30_000, 'other'), current)).toBe(false)
  })

  it('accepts a strictly later expiry', () => {
    expect(isBetterToken(tokenExpiringAt(NOW + 120_000, 'other'), current)).toBe(true)
  })

  it('accepts any readable token when we hold nothing', () => {
    expect(isBetterToken(tokenExpiringAt(NOW + 1000), null)).toBe(true)
  })
})

describe('describeTrigger', () => {
  it('describes every trigger', () => {
    expect(describeTrigger('launch')).toContain('launch')
    expect(describeTrigger('foreground')).toContain('foreground')
    expect(describeTrigger('timer')).toContain('scheduled')
  })
})
