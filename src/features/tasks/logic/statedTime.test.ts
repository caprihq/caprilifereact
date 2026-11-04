import {
  isAppointment,
  plannedStartMs,
  statedStartMs,
  statedTimeIn,
  statedTimeOf,
  withStatedTime,
} from './statedTime'

const ZONE = 'America/Chicago'
/** Wednesday 28 Oct 2026, 10:45 in Chicago (CDT, UTC−5). */
const NOW = Date.UTC(2026, 9, 28, 15, 45)
const at = (hour: number, minute = 0, day = 28) => Date.UTC(2026, 9, day, hour + 5, minute)

describe('statedTimeIn', () => {
  it.each([
    ['7 PM', 19, 0],
    ['dinner at 7pm', 19, 0],
    ['7:30 p.m.', 19, 30],
    ['9am standup', 9, 0],
    ['12am', 0, 0],
    ['12pm lunch', 12, 0],
    ['7–9pm', 19, 0],
    ['7-9 pm', 19, 0],
    ['lunch at noon', 12, 0],
    ['at 19:00', 19, 0],
    ['08:30 call', 8, 30],
  ])('reads %p', (text, hour, minute) => {
    expect(statedTimeIn(text)).toEqual({ hour, minute })
  })

  it.each([
    'Send the report by 5pm',
    'Finish before 3 PM',
    'Due 9am',
    'Call before noon',
    'at 7',
    'meet 7:30',
    'Buy 2 apples',
    '2 hours of focus',
  ])('ignores deadlines and ambiguous numbers: %p', (text) => {
    expect(statedTimeIn(text)).toBeNull()
  })

  it('takes the first time written', () => {
    expect(statedTimeIn('Gym 6am, then breakfast 8am')).toEqual({ hour: 6, minute: 0 })
  })
})

describe('statedTimeOf', () => {
  it('reads the title before the notes, and tolerates null notes', () => {
    expect(statedTimeOf({ title: 'Dinner with friends', description: '7 PM' })).toEqual({
      hour: 19,
      minute: 0,
    })
    expect(statedTimeOf({ title: 'Call at 9am', description: '7 PM' })).toEqual({
      hour: 9,
      minute: 0,
    })
    expect(
      statedTimeOf({ title: 'Plain task', description: null as unknown as string }),
    ).toBeNull()
  })
})

describe('statedStartMs', () => {
  const dinner = { title: 'Dinner with friends', description: '7 PM' }

  it('puts the time on the due day, in the user’s zone', () => {
    expect(statedStartMs({ ...dinner, due_date: '2026-10-27T14:00:00.000Z' }, ZONE)).toBe(
      at(19, 0, 27),
    )
  })

  it('needs a due date', () => {
    expect(statedStartMs(dinner, ZONE)).toBeNull()
  })
})

describe('isAppointment and plannedStartMs', () => {
  const due = '2026-10-28T14:00:00.000Z'

  it('counts scheduled events and stated times, not ordinary work', () => {
    expect(isAppointment({ title: 'Standup', is_scheduled_event: true }, ZONE)).toBe(true)
    expect(isAppointment({ title: 'Dinner', description: '7 PM', due_date: due }, ZONE)).toBe(
      true,
    )
    expect(isAppointment({ title: 'Review budget', due_date: due }, ZONE)).toBe(false)
  })

  it('prefers a booked time to a stated one', () => {
    const booked = '2026-10-28T18:00:00.000Z'
    expect(
      plannedStartMs(
        { title: 'Dinner', description: '7 PM', due_date: due, scheduled_start_time: booked },
        ZONE,
      ),
    ).toBe(Date.parse(booked))
    expect(plannedStartMs({ title: 'Dinner', description: '7 PM', due_date: due }, ZONE)).toBe(
      at(19),
    )
    expect(plannedStartMs({ title: 'Review budget' }, ZONE)).toBeNull()
  })
})

describe('withStatedTime', () => {
  const when = { nowMs: NOW, timeZone: ZONE }

  it('makes a captured time a scheduled event tonight', () => {
    const draft = withStatedTime(
      { title: 'Dinner with friends' },
      'dinner with friends at 7pm',
      when,
    )
    expect(draft).toMatchObject({ is_scheduled_event: true })
    expect(Date.parse(draft.scheduled_start_time ?? '')).toBe(at(19))
    expect(draft.due_date).toBe(draft.scheduled_start_time)
  })

  it('uses tomorrow when today’s time has passed, and the due day when there is one', () => {
    const early = withStatedTime({ title: 'Gym' }, 'gym 6am', when)
    expect(Date.parse(early.scheduled_start_time ?? '')).toBe(at(6, 0, 29))

    const friday = withStatedTime(
      { title: 'Party', due_date: '2026-10-30T15:00:00.000Z' },
      'party 8pm friday',
      when,
    )
    expect(Date.parse(friday.scheduled_start_time ?? '')).toBe(at(20, 0, 30))
    expect(friday.due_date).toBe('2026-10-30T15:00:00.000Z')
  })

  it('leaves ordinary work and decided drafts alone', () => {
    const plain = { title: 'Send report' }
    expect(withStatedTime(plain, 'send report by 5pm', when)).toBe(plain)
    const decided = { title: 'Dinner', is_scheduled_event: false }
    expect(withStatedTime(decided, 'dinner 7pm', when)).toBe(decided)
  })
})
