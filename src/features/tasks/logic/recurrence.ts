import { assertNever } from '@/utils'
import type { Recurrence, Task } from '@/types/entities'

/**
 * Recurrence rules — native port of web/src/components/tasks/recurrenceUtils.jsx.
 *
 * THREE DELIBERATE CHANGES FROM THE WEB VERSION
 *
 * 1. Pure. The web function computed the next date *and* called
 *    `Task.create()`, so the date maths could not be tested without a backend
 *    (§2.3). Here `nextOccurrence` is arithmetic and `nextRecurrencePatch`
 *    returns the payload; the caller owns the write.
 * 2. Total. The web version assigned `nextDate` from an if/else-if chain with no
 *    final branch, so an unrecognised recurrence left it `undefined` and
 *    `nextDate.toISOString()` threw (§2.6).
 * 3. No date-fns. `addMonths` is implemented here with the same clamping
 *    behaviour, so 31 January + 1 month is 28 February rather than 3 March.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type RecurrenceOption = {
  readonly value: Recurrence
  readonly label: string
}

/** Labels match the web picker exactly. */
export const RECURRENCE_OPTIONS: readonly RecurrenceOption[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const recurrenceLabel = (recurrence: Recurrence | undefined): string =>
  RECURRENCE_OPTIONS.find((option) => option.value === (recurrence ?? 'none'))?.label ??
  'Does not repeat'

export const isRecurring = (task: Task): boolean => (task.recurrence ?? 'none') !== 'none'

/** Clamps the day of month, the way date-fns `addMonths` does. */
const addMonths = (date: Date, count: number): Date => {
  const dayOfMonth = date.getDate()
  const result = new Date(date.getTime())
  // Move to the 1st first, or adding a month to the 31st overflows the target.
  result.setDate(1)
  result.setMonth(result.getMonth() + count)
  // Day 0 of the following month is the last day of the target month.
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(dayOfMonth, daysInTargetMonth))
  return result
}

const advance = (base: Date, recurrence: Exclude<Recurrence, 'none'>): Date => {
  switch (recurrence) {
    case 'daily':
      return new Date(base.getTime() + DAY_MS)
    case 'weekly':
      return new Date(base.getTime() + 7 * DAY_MS)
    case 'monthly':
      return addMonths(base, 1)
    default:
      return assertNever(recurrence)
  }
}

/**
 * 9am on the day of `nowMs`. The web client's anchor for a recurring task with
 * no due date, so the time of day does not bleed into future occurrences.
 */
const nineAmOn = (nowMs: number): Date => {
  const date = new Date(nowMs)
  date.setHours(9, 0, 0, 0)
  return date
}

/**
 * When this task should next appear, or null when it should not recur again —
 * because it does not repeat, its anchor date is unreadable, or the next date
 * would fall past `recurrence_end_date`.
 */
export const nextOccurrence = (task: Task, nowMs: number): Date | null => {
  const recurrence = task.recurrence ?? 'none'
  if (recurrence === 'none') return null

  const base = task.due_date ? new Date(task.due_date) : nineAmOn(nowMs)
  if (Number.isNaN(base.getTime())) return null

  const next = advance(base, recurrence)

  if (task.recurrence_end_date) {
    const end = new Date(task.recurrence_end_date)
    // An unreadable end date must not silently stop the series.
    if (!Number.isNaN(end.getTime()) && next.getTime() > end.getTime()) return null
  }

  return next
}

/**
 * Drop keys whose value is undefined.
 *
 * `exactOptionalPropertyTypes` treats `{ description: undefined }` as different
 * from `{}`, and Base44 omits unset fields from responses — so the carried-over
 * fields have to be absent rather than explicitly undefined.
 */
type WithGaps<T> = { readonly [K in keyof T]: T[K] | undefined }

const withoutUndefined = <T extends object>(source: WithGaps<T>): Partial<T> => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) result[key] = value
  }
  return result as Partial<T>
}

/**
 * The task to create for the next occurrence, or null if there isn't one.
 *
 * Carries forward exactly the fields the web version did. Notably NOT carried:
 * `subtasks` (a fresh occurrence starts unchecked) and any scheduling or
 * calendar ids, which belong to the occurrence that just finished.
 */
export const nextRecurrencePatch = (task: Task, nowMs: number): Partial<Task> | null => {
  const next = nextOccurrence(task, nowMs)
  if (!next) return null

  return withoutUndefined<Partial<Task>>({
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    priority_score: task.priority_score,
    priority_reason: task.priority_reason,
    estimated_minutes: task.estimated_minutes,
    recurrence: task.recurrence,
    recurrence_end_date: task.recurrence_end_date,
    due_date: next.toISOString(),
    status: 'pending',
  })
}
