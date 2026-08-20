import { describeError, redact, summarizeError } from './errorDetail'

describe('redact', () => {
  it('strips access_token values from URLs', () => {
    const result = redact('https://x.test/cb?access_token=abc123&state=1')
    expect(result).not.toContain('abc123')
    expect(result).toContain('<redacted>')
    expect(result).toContain('state=1')
  })

  it('strips bearer tokens', () => {
    expect(redact('Authorization: Bearer eyJhbGciOi.payload.sig')).not.toContain('eyJhbGciOi')
  })
})

describe('describeError — did it reach the server?', () => {
  it('says no for a bare network failure', () => {
    const detail = describeError({ message: 'Network Error', code: 'ERR_NETWORK' })
    expect(detail.reachedServer).toBe(false)
    expect(detail.code).toBe('ERR_NETWORK')
  })

  it('says yes when there is a response', () => {
    const detail = describeError({ message: 'Request failed', response: { status: 401 } })
    expect(detail.reachedServer).toBe(true)
    expect(detail.status).toBe(401)
  })

  it('says yes when only a top-level status is present', () => {
    // The SDK sometimes reshapes errors and drops `response`.
    const detail = describeError({ message: 'nope', status: 403 })
    expect(detail.reachedServer).toBe(true)
    expect(detail.status).toBe(403)
  })
})

describe('describeError — details', () => {
  it('captures method and full url, redacted', () => {
    const detail = describeError({
      message: 'x',
      config: { method: 'post', baseURL: 'https://api.test', url: '/login?access_token=zzz' },
    })
    expect(detail.method).toBe('POST')
    expect(detail.url).toBe('https://api.test/login?access_token=<redacted>')
  })

  it('keeps the response body, where Base44 puts its message', () => {
    const detail = describeError({
      message: 'Request failed',
      response: { status: 400, data: { error: 'password too short' } },
    })
    expect(detail.body).toContain('password too short')
  })

  /**
   * The real thing, captured from a rejected sign-in on device. Base44Error
   * flattens the axios error: body on `data`, no `response`, config only on the
   * wrapped original. Reading `response.data` alone found nothing here, so the
   * server's "Invalid email or password" never reached the user.
   */
  it('reads a Base44Error, which carries the body on `data`', () => {
    const detail = describeError({
      name: 'Base44Error',
      message: 'Invalid email or password',
      status: 400,
      data: {
        error_type: 'HTTPException',
        message: 'Invalid email or password',
        detail: 'Invalid email or password',
      },
      originalError: {
        code: undefined,
        config: { method: 'post', baseURL: 'https://api.test', url: '/auth/login' },
      },
    })

    expect(detail.reachedServer).toBe(true)
    expect(detail.status).toBe(400)
    expect(detail.body).toContain('Invalid email or password')
    // Diagnostics kept the request too, which the flattened shape had also lost.
    expect(detail.method).toBe('POST')
    expect(detail.url).toBe('https://api.test/auth/login')
  })

  it('takes the transport code from the wrapped axios error when offline', () => {
    const detail = describeError({
      name: 'Base44Error',
      message: 'Network Error',
      originalError: { code: 'ERR_NETWORK' },
    })

    expect(detail.reachedServer).toBe(false)
    expect(detail.code).toBe('ERR_NETWORK')
  })

  it('truncates a very long body', () => {
    const detail = describeError({ message: 'x', response: { status: 500, data: 'y'.repeat(5000) } })
    expect(detail.body?.length).toBeLessThan(500)
    expect(detail.body?.endsWith('…')).toBe(true)
  })

  it('survives a body that will not serialise', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(describeError({ message: 'x', response: { status: 500, data: circular } }).body).toBe(
      '<unserialisable body>',
    )
  })

  it('falls back to statusText when there is no message', () => {
    expect(describeError({ response: { status: 502, statusText: 'Bad Gateway' } }).message).toBe(
      'Bad Gateway',
    )
  })

  it('handles values that are not objects at all', () => {
    expect(describeError('just a string').message).toBe('just a string')
    expect(describeError(undefined).reachedServer).toBe(false)
    expect(describeError(null).message).toBe('null')
  })

  it('never reports a missing message as undefined', () => {
    expect(describeError({}).message).toMatch(/no message/i)
  })
})

describe('summarizeError', () => {
  it('leads with the fact that nothing reached the server', () => {
    const summary = summarizeError(describeError({ message: 'Network Error', code: 'ERR_NETWORK' }))
    expect(summary).toContain('NEVER REACHED SERVER')
    expect(summary).toContain('ERR_NETWORK')
  })

  it('reports the status when the server answered', () => {
    const summary = summarizeError(describeError({ message: 'no', response: { status: 401 } }))
    expect(summary).toContain('401')
  })
})
