import { friendlyMessage } from './userMessage'

const FALLBACK = "Couldn't save that."

/** The shape Base44's SDK rejects with: a flattened axios error. */
const serverError = (status: number, message = 'Request failed') => ({
  message,
  status,
  data: { message: 'internal: pg_connection_pool exhausted' },
})

describe('friendlyMessage', () => {
  it('never repeats what the server said', () => {
    // The whole point: server text is for the log, not for the user.
    const shown = friendlyMessage(serverError(500), FALLBACK)

    expect(shown).not.toContain('pg_connection_pool')
    expect(shown).not.toContain('Request failed')
    expect(shown).toBe('CAPRI is unavailable right now. Please try again shortly.')
  })

  it('treats anything that never reached the server as offline', () => {
    // A bare transport failure carries no status, and "Network request failed" is
    // not something to show anybody.
    expect(friendlyMessage(new Error('Network request failed'), FALLBACK)).toBe(
      'You appear to be offline. Check your connection and try again.',
    )
  })

  it('says the session ended rather than "401"', () => {
    expect(friendlyMessage(serverError(401), FALLBACK)).toBe(
      'Your session has ended. Please sign in again.',
    )
  })

  it('names the plan as the reason for a refusal', () => {
    expect(friendlyMessage(serverError(403), FALLBACK)).toBe('Your plan does not include that.')
  })

  it('asks for patience on a rate limit', () => {
    expect(friendlyMessage(serverError(429), FALLBACK)).toBe(
      'That was a lot at once. Please wait a moment and try again.',
    )
  })

  it('covers every 5xx, not only the ones anyone thought of', () => {
    expect(friendlyMessage(serverError(503), FALLBACK)).toBe(
      friendlyMessage(serverError(599), FALLBACK),
    )
  })

  it("uses the caller's own wording when the failure says nothing useful", () => {
    // 404 and 400 mean different things per feature, so the feature decides.
    expect(friendlyMessage(serverError(404), FALLBACK)).toBe(FALLBACK)
    expect(friendlyMessage(serverError(400), FALLBACK)).toBe(FALLBACK)
  })

  it('handles a thrown non-object without showing "[object Object]"', () => {
    expect(friendlyMessage('boom', FALLBACK)).toBe(
      'You appear to be offline. Check your connection and try again.',
    )
  })
})
