import { windowForSuggestion } from './suggestionWindow'
import type { Task } from '@/types/entities'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Task',
  status: 'pending',
  ...overrides,
})

describe('windowForSuggestion', () => {
  it('writes the same three fields manual scheduling writes', () => {
    // Accepting a suggestion and dropping a task into a block must produce the same
    // shape, or a task lands in the planner one way and not the other.
    const window = windowForSuggestion('2026-03-10T13:00:00Z', task({ estimated_minutes: 45 }))

    expect(window).toEqual({
      due_date: '2026-03-10T13:00:00.000Z',
      scheduled_start_time: '2026-03-10T13:00:00.000Z',
      scheduled_end_time: '2026-03-10T13:45:00.000Z',
    })
  })

  it('falls back to the default length when the task has no estimate', () => {
    const window = windowForSuggestion('2026-03-10T13:00:00Z', task())
    expect(window?.scheduled_end_time).toBe('2026-03-10T13:30:00.000Z')
  })

  it('refuses a time it cannot parse', () => {
    // The suggestion comes from a backend response; a bad value must not be written
    // to the task as "Invalid Date".
    expect(windowForSuggestion('not-a-time', task())).toBeNull()
    expect(windowForSuggestion('', undefined)).toBeNull()
  })
})

describe('windowForSuggestion — the deadline survives', () => {
  const task = (over: Partial<Task> = {}): Task => ({
    id: 't',
    title: 'T',
    status: 'pending',
    ...over,
  })

  it('leaves an existing due date alone', () => {
    // Scheduling Tuesday for a task due Friday used to make it due Tuesday, and the
    // real deadline was gone for good.
    const window = windowForSuggestion('2026-09-22T09:00:00.000Z', task({
      due_date: '2026-09-25T00:00:00.000Z',
    }))

    expect(window).not.toHaveProperty('due_date')
  })

  it('sets one when the task had none', () => {
    // Otherwise "scheduled for Tuesday" reads as open-ended everywhere else.
    const window = windowForSuggestion('2026-09-22T09:00:00.000Z', task())

    expect(window?.due_date).toBe('2026-09-22T09:00:00.000Z')
  })

  it('still writes the start and end either way', () => {
    const window = windowForSuggestion('2026-09-22T09:00:00.000Z', task({
      due_date: '2026-09-25T00:00:00.000Z',
      estimated_minutes: 45,
    }))

    expect(window?.scheduled_start_time).toBe('2026-09-22T09:00:00.000Z')
    expect(window?.scheduled_end_time).toBe('2026-09-22T09:45:00.000Z')
  })
})
