import { authErrorMessage, isEmailUnverified, isRetryable } from './authErrors'

const FALLBACK = 'Could not sign in.'

/** Shaped like an axios rejection, which is what the SDK throws. */
const serverError = (status: number, body?: unknown) => ({
  message: 'Request failed',
  response: { status, ...(body === undefined ? {} : { data: body }) },
})

const networkError = { message: 'Network Error', code: 'ERR_NETWORK' }

describe('authErrorMessage', () => {
  it('reports a connection problem when nothing reached the server', () => {
    const message = authErrorMessage(networkError, FALLBACK)
    expect(message).toMatch(/connection/i)
    expect(message).not.toBe(FALLBACK)
  })

  it('does not reveal whether an account exists on a rejected sign-in', () => {
    // Distinguishing "no such user" from "wrong password" lets anyone
    // enumerate registered addresses.
    expect(authErrorMessage(serverError(401), FALLBACK)).toBe('Incorrect email or password.')
    expect(authErrorMessage(serverError(403), FALLBACK)).toBe('Incorrect email or password.')
  })

  it('maps the statuses the flows actually produce', () => {
    expect(authErrorMessage(serverError(404), FALLBACK)).toMatch(/no capri account/i)
    expect(authErrorMessage(serverError(409), FALLBACK)).toMatch(/already exists/i)
    expect(authErrorMessage(serverError(410), FALLBACK)).toMatch(/expired/i)
    expect(authErrorMessage(serverError(429), FALLBACK)).toMatch(/too many attempts/i)
  })

  it('treats any 5xx as an outage, including unmapped ones', () => {
    for (const status of [500, 502, 503, 504, 599]) {
      expect(authErrorMessage(serverError(status), FALLBACK)).toMatch(/unavailable/i)
    }
  })

  it("surfaces Base44's own wording for validation failures", () => {
    const message = authErrorMessage(
      serverError(422, { message: 'Password must contain a number' }),
      FALLBACK,
    )
    expect(message).toBe('Password must contain a number')
  })

  it('reads `detail` when there is no `message`', () => {
    expect(authErrorMessage(serverError(400, { detail: 'Email already verified' }), FALLBACK)).toBe(
      'Email already verified',
    )
  })

  /**
   * Every case above uses the axios shape, which is why this gap survived: the
   * SDK does not throw axios errors. It throws `Base44Error`, with the body on
   * `data` and no `response` at all, and a wrong password reached the user as
   * "That request was not accepted" — the vaguest line in the table — while the
   * server had said exactly what was wrong.
   *
   * Captured verbatim from a rejected sign-in on device.
   */
  it("surfaces the server's wording from a Base44Error, not just an axios error", () => {
    const base44Error = {
      name: 'Base44Error',
      message: 'Invalid email or password',
      status: 400,
      data: {
        error_type: 'HTTPException',
        message: 'Invalid email or password',
        detail: 'Invalid email or password',
      },
    }
    expect(authErrorMessage(base44Error, FALLBACK)).toBe('Invalid email or password')
  })

  it('still hides internal wording on a Base44Error outside validation statuses', () => {
    const base44Error = {
      name: 'Base44Error',
      message: 'Internal Server Error',
      status: 500,
      data: { detail: 'psycopg2.OperationalError: connection refused' },
    }
    const message = authErrorMessage(base44Error, FALLBACK)
    expect(message).not.toMatch(/psycopg2/)
    expect(message).toMatch(/unavailable/i)
  })

  it('does NOT surface server wording outside validation statuses', () => {
    // A 500 body is internal detail, not something to show a user.
    const message = authErrorMessage(
      serverError(500, { message: 'psycopg2.OperationalError: connection refused' }),
      FALLBACK,
    )
    expect(message).not.toMatch(/psycopg2/)
    expect(message).toMatch(/unavailable/i)
  })

  it('ignores a non-JSON body rather than showing HTML', () => {
    const message = authErrorMessage(serverError(422, '<html><body>Gateway</body></html>'), FALLBACK)
    expect(message).not.toMatch(/</)
  })

  it('falls back when the server answered with no usable status', () => {
    expect(authErrorMessage({ message: 'odd', response: {} }, FALLBACK)).toBe(FALLBACK)
  })

  it('never returns an empty string', () => {
    for (const error of [networkError, serverError(401), serverError(418), {}, null, 'boom']) {
      expect(authErrorMessage(error, FALLBACK).length).toBeGreaterThan(0)
    }
  })
})

describe('isRetryable', () => {
  it('is true when the problem is the connection or the server', () => {
    expect(isRetryable(networkError)).toBe(true)
    expect(isRetryable(serverError(503))).toBe(true)
  })

  it('is false when the user must change something', () => {
    // Offering "Try again" on a wrong password just invites the same failure.
    expect(isRetryable(serverError(401))).toBe(false)
    expect(isRetryable(serverError(409))).toBe(false)
    expect(isRetryable(serverError(422))).toBe(false)
  })
})

describe('isEmailUnverified', () => {
  /**
   * The real payload, captured from Base44 when signing in as an account that
   * registered but never entered its code. It is a 400 — the same status as a wrong
   * password — so only the wording tells them apart, and getting this wrong either
   * strands a real user or sends someone with a bad password to a code screen.
   */
  const unverified = {
    name: 'Base44Error',
    message: 'Please verify your email before logging in. Check your email for the verification code.',
    status: 400,
    data: {
      detail: 'Please verify your email before logging in. Check your email for the verification code.',
    },
  }

  it('recognises the unverified-account refusal', () => {
    expect(isEmailUnverified(unverified)).toBe(true)
  })

  it('reads it from the body when the top-level message is generic', () => {
    expect(
      isEmailUnverified({
        message: 'Request failed with status code 400',
        status: 400,
        data: { message: 'Email not verified' },
      }),
    ).toBe(true)
  })

  it('does NOT mistake a wrong password for it', () => {
    // Same status, different wording. Routing this to the OTP screen would ask for
    // a code the user was never sent.
    expect(
      isEmailUnverified({
        name: 'Base44Error',
        message: 'Invalid email or password',
        status: 400,
        data: { detail: 'Invalid email or password' },
      }),
    ).toBe(false)
  })

  it('does not fire on 401, 404, 429 or a 500', () => {
    for (const status of [401, 404, 429, 500]) {
      expect(isEmailUnverified({ message: 'Please verify your email', status })).toBe(false)
    }
  })

  it('does not fire when the request never reached the server', () => {
    // Offline is not a verification problem, and treating it as one would send the
    // user to a screen that cannot work.
    expect(isEmailUnverified({ message: 'Network Error', code: 'ERR_NETWORK' })).toBe(false)
  })

  it('surfaces the same case as readable copy when it is shown as an error', () => {
    // 400 is in SAFE_TO_SURFACE, so the server's own wording reaches the user.
    expect(authErrorMessage(unverified, FALLBACK)).toMatch(/verify your email/i)
  })
})
