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
    const window = windowForSuggestion({ suggested_time: '2026-03-10T13:00:00Z' }, task({ estimated_minutes: 45 }))

    expect(window).toEqual({
      due_date: '2026-03-10T13:00:00.000Z',
      scheduled_start_time: '2026-03-10T13:00:00.000Z',
      scheduled_end_time: '2026-03-10T13:45:00.000Z',
    })
  })

  it('falls back to the default length when the task has no estimate', () => {
    const window = windowForSuggestion({ suggested_time: '2026-03-10T13:00:00Z' }, task())
    expect(window?.scheduled_end_time).toBe('2026-03-10T13:30:00.000Z')
  })

  it('refuses a time it cannot parse', () => {
    // The suggestion comes from a backend response; a bad value must not be written
    // to the task as "Invalid Date".
    expect(windowForSuggestion({ suggested_time: 'not-a-time' }, task())).toBeNull()
    expect(windowForSuggestion({ suggested_time: '' }, undefined)).toBeNull()
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
    const window = windowForSuggestion({ suggested_time: '2026-09-22T09:00:00.000Z' }, task({
      due_date: '2026-09-25T00:00:00.000Z',
    }))

    expect(window).not.toHaveProperty('due_date')
  })

  it('sets one when the task had none', () => {
    // Otherwise "scheduled for Tuesday" reads as open-ended everywhere else.
    const window = windowForSuggestion({ suggested_time: '2026-09-22T09:00:00.000Z' }, task())

    expect(window?.due_date).toBe('2026-09-22T09:00:00.000Z')
  })

  it('still writes the start and end either way', () => {
    const window = windowForSuggestion({ suggested_time: '2026-09-22T09:00:00.000Z' }, task({
      due_date: '2026-09-25T00:00:00.000Z',
      estimated_minutes: 45,
    }))

    expect(window?.scheduled_start_time).toBe('2026-09-22T09:00:00.000Z')
    expect(window?.scheduled_end_time).toBe('2026-09-22T09:45:00.000Z')
  })
})

describe('windowForSuggestion — the planner decides the length', () => {
  const task = (over: Partial<Task> = {}): Task => ({
    id: 't',
    title: 'T',
    status: 'pending',
    ...over,
  })

  it('books the end the planner reserved', () => {
    // Recomputing from the task's estimate would book 30 minutes of a 2-hour slot.
    const window = windowForSuggestion(
      {
        suggested_time: '2026-10-20T14:00:00.000Z',
        suggested_end: '2026-10-20T16:00:00.000Z',
        estimated_minutes: 120,
      },
      task(),
    )

    expect(window?.scheduled_end_time).toBe('2026-10-20T16:00:00.000Z')
  })

  it('saves an inferred length as the estimate', () => {
    const window = windowForSuggestion(
      { suggested_time: '2026-10-20T14:00:00.000Z', estimated_minutes: 120 },
      task(),
    )

    expect(window?.estimated_minutes).toBe(120)
    expect(window?.scheduled_end_time).toBe('2026-10-20T16:00:00.000Z')
  })

  it('never overwrites a length the user set', () => {
    const window = windowForSuggestion(
      { suggested_time: '2026-10-20T14:00:00.000Z', estimated_minutes: 120 },
      task({ estimated_minutes: 15 }),
    )

    expect(window).not.toHaveProperty('estimated_minutes')
    expect(window?.scheduled_end_time).toBe('2026-10-20T14:15:00.000Z')
  })

  it('ignores an end that is not after the start', () => {
    const window = windowForSuggestion(
      { suggested_time: '2026-10-20T14:00:00.000Z', suggested_end: '2026-10-20T13:00:00.000Z' },
      task({ estimated_minutes: 45 }),
    )

    expect(window?.scheduled_end_time).toBe('2026-10-20T14:45:00.000Z')
  })
})
