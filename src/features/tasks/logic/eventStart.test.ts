import { eventStartFrom, nextHalfHour, withTime } from './eventStart'

describe('nextHalfHour', () => {
  it('rounds up to the coming half hour', () => {
    expect(nextHalfHour(Date.parse('2026-09-17T09:12:00Z')).toISOString()).toBe(
      '2026-09-17T09:30:00.000Z',
    )
  })

  it('moves on when already exactly on one', () => {
    // Offering a start time that has already arrived is not a choice anyone wants.
    expect(nextHalfHour(Date.parse('2026-09-17T09:30:00Z')).toISOString()).toBe(
      '2026-09-17T10:00:00.000Z',
    )
  })

  it('crosses midnight rather than clamping to the same day', () => {
    expect(nextHalfHour(Date.parse('2026-09-17T23:45:00Z')).toISOString()).toBe(
      '2026-09-18T00:00:00.000Z',
    )
  })
})

describe('withTime', () => {
  it('keeps the day and changes the time of day', () => {
    const base = new Date(2026, 8, 17, 14, 30)
    const moved = withTime(base, new Date(2026, 0, 1, 9, 5))

    expect(moved.getDate()).toBe(17)
    expect(moved.getHours()).toBe(9)
    expect(moved.getMinutes()).toBe(5)
  })

  it('drops seconds, so two events at "9:05" compare equal', () => {
    const moved = withTime(new Date(2026, 8, 17), new Date(2026, 0, 1, 9, 5, 42))

    expect(moved.getSeconds()).toBe(0)
    expect(moved.getMilliseconds()).toBe(0)
  })
})

describe('eventStartFrom', () => {
  const time = new Date(2026, 0, 1, 14, 30)

  it('puts the chosen time on the day the task is due', () => {
    const iso = eventStartFrom({
      dueDate: new Date(2026, 11, 25, 9, 0).toISOString(),
      time,
      nowMs: Date.parse('2026-09-17T09:00:00Z'),
    })
    const start = new Date(iso)

    expect(start.getMonth()).toBe(11)
    expect(start.getDate()).toBe(25)
    expect(start.getHours()).toBe(14)
    expect(start.getMinutes()).toBe(30)
  })

  it('uses today when no due date has been set', () => {
    // The web sheet discards the time here, storing no start at all — and an event
    // with no start is shown nowhere. Its own detail sheet falls back to today.
    const nowMs = Date.parse('2026-09-17T09:00:00Z')
    const start = new Date(eventStartFrom({ dueDate: undefined, time, nowMs }))

    expect(start.toDateString()).toBe(new Date(nowMs).toDateString())
    expect(start.getHours()).toBe(14)
  })

  it('uses today when the stored due date is unreadable', () => {
    const nowMs = Date.parse('2026-09-17T09:00:00Z')
    const start = new Date(eventStartFrom({ dueDate: 'not a date', time, nowMs }))

    expect(start.toDateString()).toBe(new Date(nowMs).toDateString())
  })
})
