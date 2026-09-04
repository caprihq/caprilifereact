import { toTaskPatch } from './toTaskPatch'
import type { ParsedTask } from './parseTaskInput'

const draft = (overrides: Partial<ParsedTask> = {}): ParsedTask => ({
  title: 'Task',
  ...overrides,
})

describe('toTaskPatch', () => {
  it('sends notes, which the app previously dropped on every edit', () => {
    // A description written on the web was invisible here *and* wiped by the next
    // save from this app, because the patch never carried the field.
    expect(toTaskPatch(draft({ description: '  call the bank  ' }))).toEqual({
      title: 'Task',
      description: 'call the bank',
    })
  })

  it('omits fields the user never touched, rather than clearing them', () => {
    // Base44 leaves an absent field alone. Sending `undefined` values would be
    // meaningless; sending nulls would erase data the form never showed.
    expect(toTaskPatch(draft())).toEqual({ title: 'Task' })
  })

  it('clears the recurrence end date when a task repeats without one', () => {
    // Null, explicitly: an omitted field would leave a stale stop date on a series
    // the user just changed.
    expect(toTaskPatch(draft({ recurrence: 'weekly' }))).toEqual({
      title: 'Task',
      recurrence: 'weekly',
      recurrence_end_date: null,
    })
  })

  it('carries the end date when there is one', () => {
    expect(
      toTaskPatch(draft({ recurrence: 'daily', recurrence_end_date: '2026-12-31T00:00:00Z' })),
    ).toEqual({
      title: 'Task',
      recurrence: 'daily',
      recurrence_end_date: '2026-12-31T00:00:00Z',
    })
  })

  it('marks a commitment, and stays silent when it is not one', () => {
    // `is_scheduled_event` keeps an item out of the ranking, so setting it to false
    // explicitly would be harmless but noisy; the default already is false.
    expect(toTaskPatch(draft({ is_scheduled_event: true })).is_scheduled_event).toBe(true)
    expect(toTaskPatch(draft({ is_scheduled_event: false }))).toEqual({ title: 'Task' })
  })
})
