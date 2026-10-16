import {
  isLinkEvidence,
  messageFor,
  needsReconnect,
  stateFromError,
  stateFromReply,
  statusLabel,
} from './calendarStatus'
import type { ConnectionState } from './calendarStatus'

describe('stateFromReply', () => {
  it('is connected only when a list of events came back', () => {
    expect(stateFromReply({ events: [] })).toBe('connected')
    expect(stateFromReply({ events: [{ id: 'e1' }] })).toBe('connected')
  })

  it('reads the explicit not-linked reply as disconnected', () => {
    expect(stateFromReply({ events: null, connected: false })).toBe('disconnected')
  })

  it('names each problem the backend reports', () => {
    // The case Jennifer hit: signed in, approved, and no calendar scope on the grant.
    expect(stateFromReply({ error: 'x', problem: 'missing_permission' })).toBe('missing_permission')
    expect(stateFromReply({ error: 'x', problem: 'auth_failed' })).toBe('auth_failed')
    expect(stateFromReply({ error: 'x', problem: 'calendar_error' })).toBe('calendar_error')
  })

  it('never reads an error reply as connected — older backends send no problem', () => {
    expect(stateFromReply({ error: 'Request had insufficient authentication scopes.' })).toBe(
      'calendar_error',
    )
    expect(stateFromReply({ error: 'x', problem: 'something_new' })).toBe('calendar_error')
  })

  it('treats junk as an error, not as either answer', () => {
    expect(stateFromReply(undefined)).toBe('calendar_error')
    expect(stateFromReply(null)).toBe('calendar_error')
    expect(stateFromReply('nope')).toBe('calendar_error')
  })
})

describe('stateFromError', () => {
  it('finds the problem inside a thrown 403', () => {
    // Google's refusals are 401/403/500, which the SDK throws.
    const thrown = { response: { status: 403, data: { error: 'x', problem: 'missing_permission' } } }
    expect(stateFromError(thrown)).toBe('missing_permission')
  })

  it('also reads a body attached directly to the error', () => {
    expect(stateFromError({ data: { error: 'x', problem: 'auth_failed' } })).toBe('auth_failed')
  })

  it('calls a bodiless failure a calendar error, not "not connected"', () => {
    // No signal says nothing about whether anything is linked.
    expect(stateFromError(new Error('Network Error'))).toBe('calendar_error')
    expect(stateFromError(undefined)).toBe('calendar_error')
  })
})

describe('what the user sees', () => {
  const all: ConnectionState[] = [
    'connected',
    'disconnected',
    'missing_permission',
    'auth_failed',
    'calendar_error',
  ]

  it('gives every state its own label', () => {
    const labels = all.map((s) => statusLabel(s))
    expect(new Set(labels).size).toBe(all.length)
  })

  it('has a message for every state but connected', () => {
    expect(messageFor('connected')).toBeNull()
    for (const s of all.filter((x) => x !== 'connected')) expect(messageFor(s)).toBeTruthy()
  })

  it('tells a missing-permission user what to tick, not to "connect" again blindly', () => {
    expect(messageFor('missing_permission')).toMatch(/Calendar box/)
  })

  it('offers Reconnect only for linked-but-broken states', () => {
    expect(needsReconnect('missing_permission')).toBe(true)
    expect(needsReconnect('auth_failed')).toBe(true)
    expect(needsReconnect('calendar_error')).toBe(true)
    expect(needsReconnect('connected')).toBe(false)
    expect(needsReconnect('disconnected')).toBe(false)
    expect(needsReconnect('checking')).toBe(false)
  })

  it('counts only proof of a finished sign-in as reason to close the sheet', () => {
    expect(isLinkEvidence('connected')).toBe(true)
    expect(isLinkEvidence('missing_permission')).toBe(true)
    expect(isLinkEvidence('calendar_error')).toBe(false)
    expect(isLinkEvidence('auth_failed')).toBe(false)
    expect(isLinkEvidence('disconnected')).toBe(false)
  })
})
