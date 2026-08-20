import type { Task } from '@/types/entities'
import {
  RECURRENCE_OPTIONS,
  isRecurring,
  nextOccurrence,
  nextRecurrencePatch,
  recurrenceLabel,
} from './recurrence'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Water the plants',
  ...overrides,
})

/** 2026-03-10T09:00:00Z — a date with no month-end or DST complications. */
const NOW = Date.UTC(2026, 2, 10, 9, 0, 0)

const isoOf = (date: Date | null): string => date?.toISOString() ?? 'null'

describe('recurrence metadata', () => {
  it('offers exactly the four options the web picker had', () => {
    expect(RECURRENCE_OPTIONS.map((option) => option.value)).toEqual([
      'none',
      'daily',
      'weekly',
      'monthly',
    ])
  })

  it('treats a missing recurrence as "does not repeat"', () => {
    expect(recurrenceLabel(undefined)).toBe('Does not repeat')
    expect(isRecurring(task())).toBe(false)
    expect(isRecurring(task({ recurrence: 'none' }))).toBe(false)
    expect(isRecurring(task({ recurrence: 'weekly' }))).toBe(true)
  })
})

describe('nextOccurrence', () => {
  it('returns null for a task that does not repeat', () => {
    expect(nextOccurrence(task(), NOW)).toBeNull()
    expect(nextOccurrence(task({ recurrence: 'none' }), NOW)).toBeNull()
  })

  it('advances daily and weekly from the due date', () => {
    const due = new Date(Date.UTC(2026, 2, 10, 15, 30)).toISOString()
    expect(isoOf(nextOccurrence(task({ recurrence: 'daily', due_date: due }), NOW))).toBe(
      new Date(Date.UTC(2026, 2, 11, 15, 30)).toISOString(),
    )
    expect(isoOf(nextOccurrence(task({ recurrence: 'weekly', due_date: due }), NOW))).toBe(
      new Date(Date.UTC(2026, 2, 17, 15, 30)).toISOString(),
    )
  })

  it('clamps a monthly recurrence onto short months', () => {
    // 31 January + 1 month must be 28 February, not 3 March. The web version
    // relied on date-fns for this; the hand-rolled addMonths must match.
    const jan31 = new Date(2026, 0, 31, 12, 0, 0).toISOString()
    const next = nextOccurrence(task({ recurrence: 'monthly', due_date: jan31 }), NOW)
    expect(next?.getMonth()).toBe(1)
    expect(next?.getDate()).toBe(28)
  })

  it('keeps the day of month when the target month is long enough', () => {
    const mar15 = new Date(2026, 2, 15, 12, 0, 0).toISOString()
    const next = nextOccurrence(task({ recurrence: 'monthly', due_date: mar15 }), NOW)
    expect(next?.getMonth()).toBe(3)
    expect(next?.getDate()).toBe(15)
  })

  it('anchors to 9am when the task has no due date', () => {
    const next = nextOccurrence(task({ recurrence: 'daily' }), NOW)
    expect(next?.getHours()).toBe(9)
    expect(next?.getMinutes()).toBe(0)
  })

  it('stops once the next date would pass recurrence_end_date', () => {
    const due = new Date(Date.UTC(2026, 2, 10)).toISOString()
    const end = new Date(Date.UTC(2026, 2, 10)).toISOString()
    expect(nextOccurrence(task({ recurrence: 'daily', due_date: due, recurrence_end_date: end }), NOW)).toBeNull()
  })

  it('continues while the next date is still inside the window', () => {
    const due = new Date(Date.UTC(2026, 2, 10)).toISOString()
    const end = new Date(Date.UTC(2026, 11, 31)).toISOString()
    expect(nextOccurrence(task({ recurrence: 'daily', due_date: due, recurrence_end_date: end }), NOW)).not.toBeNull()
  })

  it('ignores an unreadable end date rather than silently ending the series', () => {
    const due = new Date(Date.UTC(2026, 2, 10)).toISOString()
    expect(
      nextOccurrence(task({ recurrence: 'daily', due_date: due, recurrence_end_date: 'nonsense' }), NOW),
    ).not.toBeNull()
  })

  it('returns null for an unreadable due date instead of an Invalid Date', () => {
    expect(nextOccurrence(task({ recurrence: 'daily', due_date: 'not-a-date' }), NOW)).toBeNull()
  })
})

describe('nextRecurrencePatch', () => {
  it('returns null when there is no next occurrence', () => {
    expect(nextRecurrencePatch(task(), NOW)).toBeNull()
  })

  it('carries the defining fields forward and resets status', () => {
    const patch = nextRecurrencePatch(
      task({
        recurrence: 'weekly',
        due_date: new Date(Date.UTC(2026, 2, 10)).toISOString(),
        description: 'Back garden',
        category: 'personal',
        priority: 'high',
        estimated_minutes: 15,
      }),
      NOW,
    )

    expect(patch).toMatchObject({
      title: 'Water the plants',
      description: 'Back garden',
      category: 'personal',
      priority: 'high',
      estimated_minutes: 15,
      recurrence: 'weekly',
      status: 'pending',
    })
  })

  it('omits absent fields rather than sending undefined', () => {
    // exactOptionalPropertyTypes aside, Base44 distinguishes an absent key from
    // an explicit undefined one.
    const patch = nextRecurrencePatch(
      task({ recurrence: 'daily', due_date: new Date(Date.UTC(2026, 2, 10)).toISOString() }),
      NOW,
    )
    expect(patch).not.toBeNull()
    expect(Object.keys(patch ?? {})).not.toContain('description')
    expect(Object.keys(patch ?? {})).not.toContain('recurrence_end_date')
  })

  it('does not carry subtasks — a fresh occurrence starts unchecked', () => {
    const patch = nextRecurrencePatch(
      task({
        recurrence: 'daily',
        due_date: new Date(Date.UTC(2026, 2, 10)).toISOString(),
        subtasks: [{ id: '1', title: 'Done already', completed: true }],
      }),
      NOW,
    )
    expect(Object.keys(patch ?? {})).not.toContain('subtasks')
  })
})
