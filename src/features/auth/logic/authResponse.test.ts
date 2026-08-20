import { describeResponse, needsOtp, readOtpExpiryMinutes, readToken } from './authResponse'

/** Captured from a real Base44 registration on device. */
const REAL_REGISTER_RESPONSE = {
  id: 'usr_abc123',
  message: 'A verification code has been sent',
  otp_expires_in_minutes: 10,
  country_code: 'US',
}

describe('readToken', () => {
  it('reads every key Base44 has used for a session', () => {
    expect(readToken({ access_token: 'a' })).toBe('a')
    expect(readToken({ token: 'b' })).toBe('b')
    expect(readToken({ accessToken: 'c' })).toBe('c')
  })

  it('prefers access_token when more than one is present', () => {
    expect(readToken({ token: 'legacy', access_token: 'current' })).toBe('current')
  })

  it('returns null rather than throwing on anything unexpected', () => {
    for (const value of [null, undefined, 'a string', 42, {}, { access_token: '' }, { access_token: 7 }]) {
      expect(readToken(value)).toBeNull()
    }
  })

  it('finds no token in a registration that requires verification', () => {
    expect(readToken(REAL_REGISTER_RESPONSE)).toBeNull()
  })
})

describe('needsOtp', () => {
  it('recognises both flag spellings', () => {
    expect(needsOtp({ otp_required: true })).toBe(true)
    expect(needsOtp({ requires_otp: true })).toBe(true)
  })

  it('requires the flag to be exactly true, not merely truthy', () => {
    // A string "false" is truthy, and would otherwise send a signed-in user to
    // the verification screen.
    expect(needsOtp({ otp_required: 'false' })).toBe(false)
    expect(needsOtp({ otp_required: 1 })).toBe(false)
  })

  it('is false for anything unexpected', () => {
    for (const value of [null, undefined, 'x', {}]) expect(needsOtp(value)).toBe(false)
  })
})

describe('readOtpExpiryMinutes', () => {
  it('reads the value from a real registration response', () => {
    expect(readOtpExpiryMinutes(REAL_REGISTER_RESPONSE)).toBe(10)
  })

  it('ignores values that cannot drive a countdown', () => {
    for (const value of [{ otp_expires_in_minutes: 0 }, { otp_expires_in_minutes: -5 }, { otp_expires_in_minutes: '10' }, {}, null]) {
      expect(readOtpExpiryMinutes(value)).toBeUndefined()
    }
  })
})

describe('describeResponse', () => {
  it('lists the keys and surfaces the safe values', () => {
    const summary = describeResponse(REAL_REGISTER_RESPONSE)
    expect(summary.keys).toBe('id,message,otp_expires_in_minutes,country_code')
    expect(summary.message).toBe('A verification code has been sent')
    expect(summary.otp_expires_in_minutes).toBe(10)
  })

  it('reports an id by presence only, never by value', () => {
    const summary = describeResponse(REAL_REGISTER_RESPONSE)
    expect(summary.hasId).toBe(true)
    expect(JSON.stringify(summary)).not.toContain('usr_abc123')
  })

  it('never logs a token, even though it names the key', () => {
    const summary = describeResponse({ access_token: 'super-secret-jwt', message: 'ok' })
    expect(JSON.stringify(summary)).not.toContain('super-secret-jwt')
    expect(summary.keys).toContain('access_token')
  })

  it('describes a non-object response by its type', () => {
    expect(describeResponse('nope')).toEqual({ type: 'string' })
  })
})
