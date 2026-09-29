import { canSaveTask, taskProblems } from './taskValidation'

describe('taskProblems', () => {
  it('accepts an ordinary task with just a name', () => {
    // No time is the normal state for work: CAPRI decides when.
    expect(taskProblems({ title: 'Review budget' })).toEqual([])
  })

  it('refuses a task with no name', () => {
    expect(taskProblems({ title: '   ' })).toEqual([
      { field: 'title', message: 'Give this a name.' },
    ])
  })

  it('refuses a scheduled event with no start time', () => {
    // The whole reason this exists: such an event is saved and then appears nowhere.
    expect(taskProblems({ title: 'Dentist', is_scheduled_event: true })).toEqual([
      { field: 'scheduled_start_time', message: 'A scheduled event needs a start time.' },
    ])
  })

  it('refuses a scheduled event whose start time is unreadable', () => {
    expect(
      taskProblems({
        title: 'Dentist',
        is_scheduled_event: true,
        scheduled_start_time: 'not a date',
      }),
    ).toHaveLength(1)
  })

  it('accepts a scheduled event that has one', () => {
    expect(
      taskProblems({
        title: 'Dentist',
        is_scheduled_event: true,
        scheduled_start_time: '2026-09-21T14:00:00.000Z',
      }),
    ).toEqual([])
  })

  it('reports every problem at once, not just the first', () => {
    // Fixing one thing and being told about the next is worse than being told both.
    expect(taskProblems({ title: '', is_scheduled_event: true })).toHaveLength(2)
  })

  it('ignores a start time on a task that is not an event', () => {
    expect(canSaveTask({ title: 'Review budget', scheduled_start_time: 'nonsense' })).toBe(true)
  })
})
