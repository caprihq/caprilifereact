import type { DehydratedState } from '@tanstack/react-query'

import {
  CACHE_MAX_AGE_MS,
  CACHE_SCHEMA_VERSION,
  decodeSnapshot,
  encodeSnapshot,
  isPersistable,
} from './cacheSnapshot'

const NOW = Date.parse('2026-09-09T12:00:00Z')

const state = (): DehydratedState =>
  ({
    mutations: [],
    queries: [{ queryKey: ['tasks', 'a@b.c'], queryHash: 'h', state: { data: [] } }],
  }) as unknown as DehydratedState

describe('isPersistable', () => {
  it('keeps the data a launch needs to draw Home', () => {
    expect(isPersistable(['tasks', 'a@b.c'])).toBe(true)
    expect(isPersistable(['commitments', 'a@b.c'])).toBe(true)
    expect(isPersistable(['focusTimes', 'a@b.c'])).toBe(true)
    expect(isPersistable(['user', 'me'])).toBe(true)
  })

  it("refuses the calendar, which belongs to Google and goes stale", () => {
    // Yesterday's meetings shown as today's is worse than no meetings at all.
    expect(isPersistable(['calendarEvents'])).toBe(false)
  })

  it('refuses anything it does not recognise, including a non-string root', () => {
    expect(isPersistable(['aiUsage'])).toBe(false)
    expect(isPersistable([])).toBe(false)
    expect(isPersistable([42])).toBe(false)
  })
})

describe('decodeSnapshot', () => {
  it('reads back what was written', () => {
    const raw = encodeSnapshot(state(), NOW)

    expect(decodeSnapshot(raw, NOW + 1000)).toEqual(state())
  })

  it('returns null when nothing has been saved yet', () => {
    expect(decodeSnapshot(undefined, NOW)).toBeNull()
    expect(decodeSnapshot('', NOW)).toBeNull()
  })

  it('discards unreadable JSON rather than throwing on the launch path', () => {
    // A snapshot half-written when the app was killed mid-save.
    expect(decodeSnapshot('{"version":1,"savedAtMs":', NOW)).toBeNull()
  })

  it('discards a snapshot from a different schema', () => {
    // Rows written by an older build can hold fields this build mishandles, and
    // nothing would ever correct them once hydrated.
    const stale = JSON.stringify({
      version: CACHE_SCHEMA_VERSION + 1,
      savedAtMs: NOW,
      state: state(),
    })

    expect(decodeSnapshot(stale, NOW)).toBeNull()
  })

  it('discards anything that is not an envelope', () => {
    expect(decodeSnapshot('null', NOW)).toBeNull()
    expect(decodeSnapshot('[]', NOW)).toBeNull()
    expect(decodeSnapshot('{"version":1}', NOW)).toBeNull()
    expect(decodeSnapshot('{"version":"1","savedAtMs":0,"state":{}}', NOW)).toBeNull()
  })

  it('trusts a snapshot right up to the age limit', () => {
    const raw = encodeSnapshot(state(), NOW)

    expect(decodeSnapshot(raw, NOW + CACHE_MAX_AGE_MS)).not.toBeNull()
  })

  it('drops one past it, so a phone left in a drawer opens fresh', () => {
    const raw = encodeSnapshot(state(), NOW)

    expect(decodeSnapshot(raw, NOW + CACHE_MAX_AGE_MS + 1)).toBeNull()
  })

  it('drops a snapshot stamped in the future', () => {
    // The device clock moved backwards, which makes the age check meaningless —
    // otherwise a wrong clock pins a snapshot as permanently fresh.
    const raw = encodeSnapshot(state(), NOW)

    expect(decodeSnapshot(raw, NOW - 1)).toBeNull()
  })
})
