import { isExpired, needsRefresh, parseToken, tokenFingerprint } from './token'

/** Build an unsigned JWT with the given payload. Signature is never checked here. */
const makeToken = (payload: Record<string, unknown>): string => {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`
}

const NOW = 1_700_000_000_000 // fixed clock; nothing under test reads the real one

describe('parseToken', () => {
  it('reads exp as milliseconds', () => {
    const token = makeToken({ exp: NOW / 1000 + 3600 })
    expect(parseToken(token)?.expiresAt).toBe(NOW + 3_600_000)
  })

  it('lowercases the provider from any of the known claim names', () => {
    expect(parseToken(makeToken({ provider: 'Google' }))?.provider).toBe('google')
    expect(parseToken(makeToken({ idp: 'APPLE' }))?.provider).toBe('apple')
  })

  it('decodes non-ASCII payload values', () => {
    const token = makeToken({ provider: 'google', name: 'José' })
    expect(parseToken(token)?.provider).toBe('google')
  })

  it.each([
    ['null', null],
    ['empty', ''],
    ['not a jwt', 'abc'],
    ['bad base64', 'a.!!!!.c'],
  ])('returns null for %s', (_label, input) => {
    expect(parseToken(input)).toBeNull()
  })
})

describe('isExpired', () => {
  it('is true once exp has passed', () => {
    expect(isExpired(makeToken({ exp: NOW / 1000 - 1 }), NOW)).toBe(true)
  })

  it('is false while exp is in the future', () => {
    expect(isExpired(makeToken({ exp: NOW / 1000 + 60 }), NOW)).toBe(false)
  })

  it('treats a token with no exp as usable — the server is the authority', () => {
    expect(isExpired(makeToken({ sub: 'user_1' }), NOW)).toBe(false)
  })

  it('treats an unreadable token as not-expired so routing falls to the server', () => {
    expect(isExpired('garbage', NOW)).toBe(false)
  })
})

describe('needsRefresh', () => {
  const MARGIN = 30 * 60 * 1000

  it('is true inside the margin', () => {
    expect(needsRefresh(makeToken({ exp: NOW / 1000 + 600 }), NOW, MARGIN)).toBe(true)
  })

  it('is false well before the margin', () => {
    expect(needsRefresh(makeToken({ exp: NOW / 1000 + 7200 }), NOW, MARGIN)).toBe(false)
  })

  it('is false once already expired — that is a re-login, not a refresh', () => {
    expect(needsRefresh(makeToken({ exp: NOW / 1000 - 10 }), NOW, MARGIN)).toBe(false)
  })
})

describe('tokenFingerprint', () => {
  it('never reveals the whole token', () => {
    const token = makeToken({ exp: NOW / 1000 + 60 })
    const printed = tokenFingerprint(token)
    expect(printed).not.toContain(token)
    expect(printed).toContain('len=')
  })

  it('handles absence', () => {
    expect(tokenFingerprint(null)).toBe('(none)')
  })
})
