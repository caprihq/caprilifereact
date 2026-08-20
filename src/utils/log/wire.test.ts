import { diag, diagFailure, logError, logWarn, wire } from './diag'

/**
 * The logger's own contract, in two halves.
 *
 * **Readable.** Every line must reach the console as a *string*. React Native
 * DevTools renders an object argument as a collapsed `Object`, which cannot be
 * read at a glance or copied into a bug report — the reason these logs existed
 * and still told nobody anything.
 *
 * **Safe.** `noSecretsInLogs.test.ts` scans source for secrets passed to
 * `diag`/`console.*`, but deliberately does not scan `wire`, whose whole job is to
 * print bodies that *contain* credentials. This is what earns that exemption:
 * `wire` and `diag` redact on the way out, so a call site cannot leak by mistake.
 */

const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

/** Everything printed by the call under test, as one string. */
const printed = (): string => warn.mock.calls.map((args) => args.join(' ')).join('\n')

beforeEach(() => {
  warn.mockClear()
})

afterAll(() => {
  warn.mockRestore()
})

describe('log readability', () => {
  it('passes a single string, never an object, so DevTools shows text', () => {
    diag('auth:test', { email: 'a@b.com', count: 2 })

    expect(warn).toHaveBeenCalledTimes(1)
    const [first, ...rest] = warn.mock.calls[0] ?? []
    expect(typeof first).toBe('string')
    // A second argument is what DevTools collapses into `Object`.
    expect(rest).toHaveLength(0)
  })

  it('keeps the values visible in that string', () => {
    diag('auth:test', { email: 'a@b.com', otp_expires_in_minutes: 10 })

    expect(printed()).toContain('"email": "a@b.com"')
    expect(printed()).toContain('"otp_expires_in_minutes": 10')
  })

  it('prints a whole response body for wire, labelled', () => {
    wire('register RESPONSE', { id: 'abc', message: 'Verification code sent' })

    expect(printed()).toContain('[wire] register RESPONSE')
    expect(printed()).toContain('"message": "Verification code sent"')
  })
})

describe('logWarn / logError', () => {
  it('emit one string, never an object', () => {
    logWarn('[secretStore] read failed', { key: 'capri.auth.accessToken' })

    expect(warn).toHaveBeenCalledTimes(1)
    const [first, ...rest] = warn.mock.calls[0] ?? []
    expect(typeof first).toBe('string')
    expect(rest).toHaveLength(0)
    expect(printed()).toContain('"key": "capri.auth.accessToken"')
  })

  it('expand an Error instead of printing {}', () => {
    // The whole point: JSON.stringify(new Error('boom')) === '{}', so the old
    // `console.warn('[x] failed', error)` said nothing about the failure.
    logWarn('[calendar] connect failed', new Error('boom'))

    expect(printed()).toContain('boom')
    expect(printed()).not.toMatch(/failed \{\s*\}/)
  })

  it('expand an Error nested inside a context object', () => {
    logWarn('[secretStore] read failed', {
      key: 'capri.auth.accessToken',
      error: new Error('errSecInteractionNotAllowed'),
    })

    expect(printed()).toContain('errSecInteractionNotAllowed')
    expect(printed()).toContain('capri.auth.accessToken')
  })

  it('keep the status and URL of a request failure', () => {
    logWarn('[plan] reconcile failed', {
      name: 'Base44Error',
      message: 'Request failed with status code 403',
      status: 403,
      originalError: { config: { method: 'post', baseURL: 'https://api.test', url: '/x' } },
    })

    expect(printed()).toContain('403')
    expect(printed()).toContain('https://api.test/x')
  })

  it('logError uses the error level', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    logError('[CapriIAP] configure failed', new Error('no key'))

    expect(error).toHaveBeenCalledTimes(1)
    expect(typeof (error.mock.calls[0] ?? [])[0]).toBe('string')
    error.mockRestore()
  })

  it('label alone when there is no detail', () => {
    logWarn('[keepAlive] session expired (foreground); re-verifying')

    expect(printed()).toBe('[keepAlive] session expired (foreground); re-verifying')
  })

  it('redact a secret handed to them', () => {
    logWarn('[auth] failed', { password: 'hunter2-secret', token: 'z'.repeat(40) })

    expect(printed()).not.toContain('hunter2-secret')
    expect(printed()).not.toContain('z'.repeat(40))
  })
})

describe('log safety', () => {
  it('never prints a password handed to wire', () => {
    wire('register REQUEST', { body: { email: 'a@b.com', password: 'hunter2-secret' } })

    expect(printed()).not.toContain('hunter2-secret')
    expect(printed()).toContain('<redacted len=14>')
  })

  it('never prints a token handed to wire', () => {
    const token = 'j'.repeat(700)

    wire('signIn RESPONSE', { access_token: token, user: { id: 'u1' } })

    expect(printed()).not.toContain(token)
    expect(printed()).toContain('len=700:')
    // The rest of the body still comes through — that is the point of wire.
    expect(printed()).toContain('"id": "u1"')
  })

  it('redacts inside diag too, not only wire', () => {
    diag('auth:test', { password: 'plain-text-password' })

    expect(printed()).not.toContain('plain-text-password')
  })

  it('redacts a failure context and still leads with the summary', () => {
    diagFailure('auth:test', { response: { status: 401 } }, { password: 'oops-secret' })

    expect(printed()).toContain('server answered 401')
    expect(printed()).not.toContain('oops-secret')
  })

  it('does not throw when a body cannot be serialised', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(() => {
      wire('weird', circular)
    }).not.toThrow()
  })
})
