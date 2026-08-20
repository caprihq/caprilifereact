import { redactSecrets, stringifySafely } from './redactSecrets'

/**
 * The new wire logs print whole request and response bodies, so this redactor is
 * the only thing between "debuggable" and "a password in a pasted log". It is
 * worth more tests than the code it protects.
 */

describe('redactSecrets', () => {
  it('replaces a password with its length, never its value', () => {
    const out = redactSecrets({ email: 'a@b.com', password: 'sup3r-secret' })

    expect(out).toEqual({ email: 'a@b.com', password: '<redacted len=12>' })
    // The length is the point: it catches a trailing space or a truncated paste.
    expect(JSON.stringify(out)).not.toContain('sup3r-secret')
  })

  it.each(['password', 'newPassword', 'new_password', 'currentPassword', 'confirm_password'])(
    'redacts %s whatever it is called',
    (key) => {
      const out = redactSecrets({ [key]: 'value-to-hide' }) as Record<string, unknown>
      expect(out[key]).toBe('<redacted len=13>')
    },
  )

  it('fingerprints tokens instead of printing them', () => {
    const token = `${'header'.padEnd(40, 'x')}.${'payload'.padEnd(40, 'y')}.signature`

    const out = redactSecrets({ access_token: token }) as { access_token: string }

    expect(out.access_token).toMatch(/^len=\d+:header/)
    expect(out.access_token).not.toContain('payload')
  })

  it.each(['token', 'access_token', 'refresh_token', 'resetToken', 'id_token', 'jwt'])(
    'fingerprints %s',
    (key) => {
      const out = redactSecrets({ [key]: 'a'.repeat(64) }) as Record<string, string>
      expect(out[key]).toBe('len=64:aaaaaa…aaaa')
    },
  )

  it('keeps everything else — the useful part of a body', () => {
    const body = {
      id: '6a10840d36bfc4d60c8c7bf6',
      message: 'Verification code sent',
      otp_expires_in_minutes: 10,
      country_code: 'US',
      verified: false,
    }

    expect(redactSecrets(body)).toEqual(body)
  })

  it('reaches into nested objects and arrays', () => {
    const out = redactSecrets({
      user: { email: 'a@b.com', password: 'nested-secret' },
      sessions: [{ access_token: 'b'.repeat(40) }],
    }) as { user: { password: string }; sessions: { access_token: string }[] }

    expect(out.user.password).toBe('<redacted len=13>')
    expect(out.sessions[0]?.access_token).toMatch(/^len=40:/)
  })

  it('does not fingerprint its own output', () => {
    // tokenFp(null) is the string "null"; fingerprinting that produced
    // `len=4:<short>`, which reads as a four-character token that never existed.
    expect(redactSecrets({ token: 'null' })).toEqual({ token: 'null' })
    expect(redactSecrets({ token: 'len=700:eyJhbG…v1Rk' })).toEqual({
      token: 'len=700:eyJhbG…v1Rk',
    })
    expect(redactSecrets({ password: '<redacted len=8>' })).toEqual({
      password: '<redacted len=8>',
    })
  })

  it('still fingerprints a real token that merely starts with letters', () => {
    const token = 'nullish'.padEnd(40, 'x')
    expect(redactSecrets({ token })).toEqual({ token: `len=40:nullis…xxxx` })
  })

  it('leaves primitives and null alone', () => {
    expect(redactSecrets('plain')).toBe('plain')
    expect(redactSecrets(42)).toBe(42)
    expect(redactSecrets(null)).toBeNull()
  })
})

describe('stringifySafely', () => {
  it('produces readable multi-line text, not [object Object]', () => {
    const text = stringifySafely({ message: 'Verification code sent', otp: 10 })

    expect(text).toContain('\n')
    expect(text).toContain('"message": "Verification code sent"')
    expect(text).not.toContain('[object Object]')
  })

  it('redacts on the way out, so a caller cannot bypass it', () => {
    expect(stringifySafely({ password: 'hunter2' })).not.toContain('hunter2')
  })

  it('survives a circular body rather than throwing inside a log call', () => {
    const circular: Record<string, unknown> = { email: 'a@b.com' }
    circular.self = circular

    // Logging must never be the thing that breaks the flow it observes.
    expect(() => stringifySafely(circular)).not.toThrow()
    expect(stringifySafely(circular)).toContain('unserialisable')
  })

  it('names the type when there is nothing to serialise', () => {
    expect(stringifySafely(undefined)).toBe('')
    expect(stringifySafely(() => undefined)).toBe('<function>')
  })
})
