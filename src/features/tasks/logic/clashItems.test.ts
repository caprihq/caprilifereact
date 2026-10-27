import { fromConflict, withDayOf, withTimeOf } from './clashItems'

describe('fromConflict', () => {
  it('names the day, the time and what it overlaps', () => {
    const item = fromConflict(
      {
        task_id: 't1',
        task_title: 'Write report',
        start: '2026-10-29T14:00:00.000Z',
        end: '2026-10-29T15:00:00.000Z',
        with_title: 'Team meeting',
        with_start: '2026-10-29T14:30:00.000Z',
        with_end: '2026-10-29T15:30:00.000Z',
      },
      'UTC',
    )
    expect(item.taskId).toBe('t1')
    expect(item.detail).toBe('Thu 2:00 PM overlaps Team meeting (2:30 PM – 3:30 PM)')
  })
})

describe('withDayOf / withTimeOf', () => {
  const base = new Date(2026, 9, 27, 14, 30)

  it('moves the day and keeps the clock time', () => {
    const moved = withDayOf(base, new Date(2026, 9, 30, 8, 0))
    expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([30, 14, 30])
  })

  it('moves the clock time and keeps the day', () => {
    const moved = withTimeOf(base, new Date(2026, 0, 1, 9, 15))
    expect([moved.getMonth(), moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([9, 27, 9, 15])
  })
})
