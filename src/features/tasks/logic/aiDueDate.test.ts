import { dueDateFromModel, promptClock } from './aiDueDate'

const CHICAGO = 'America/Chicago'
/** Thursday 5 Nov 2026, 7:00 PM in Chicago (CST, UTC−6) — already Friday in UTC. */
const EVENING = Date.UTC(2026, 10, 6, 1, 0)

describe('promptClock', () => {
  it('gives the user’s own date, weekday, time and zone, not UTC’s', () => {
    expect(promptClock(EVENING, CHICAGO)).toMatch(
      /^Thursday, 2026-11-05, 7:00\sPM \(America\/Chicago\)$/,
    )
  })

  it('still gives a date for a zone it cannot read', () => {
    expect(promptClock(EVENING, 'Not/AZone')).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })
})

describe('dueDateFromModel', () => {
  it('reads a plain date as that day’s local midnight, not London’s', () => {
    expect(dueDateFromModel('2026-11-05', CHICAGO)).toBe('2026-11-05T06:00:00.000Z')
    expect(dueDateFromModel('2026-11-05', 'Asia/Tokyo')).toBe('2026-11-04T15:00:00.000Z')
  })

  it('keeps a deadline time, read as local even when the model adds a zone', () => {
    expect(dueDateFromModel('2026-11-06T17:00', CHICAGO)).toBe('2026-11-06T23:00:00.000Z')
    expect(dueDateFromModel('2026-11-06T17:00:00Z', CHICAGO)).toBe('2026-11-06T23:00:00.000Z')
  })

  it.each([null, undefined, 42, '', 'tomorrow', '2026-11-06T25:00'])(
    'leaves anything else to the fallback: %p',
    (value) => {
      expect(dueDateFromModel(value, CHICAGO)).toBeUndefined()
    },
  )
})
