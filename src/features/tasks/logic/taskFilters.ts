import { assertNever } from '@/utils'
import { isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'

/**
 * Task list filtering — native port of web/src/components/tasks/FilterBar.jsx
 * and the predicate that drove it.
 *
 * THREE DELIBERATE CHANGES FROM THE WEB VERSION
 *
 * 1. One predicate. The web client inlined the same four-branch filter twice in
 *    Home.jsx (lines 395–398 and 455–458), so the two lists could disagree.
 * 2. "Today" respects the user's timezone. The web version used
 *    `isToday(new Date(due_date))`, which is device-local — the exact bug
 *    plannerLogic was written to avoid.
 * 3. Non-mutating sort (§2.4).
 */

/**
 * Statuses that do not count as open work. Identical to the web client's
 * `INACTIVE_STATUSES` in Home.jsx, and the single definition the task feed
 * shares — the two used to be declared separately and could drift.
 */
export const INACTIVE_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'in_progress',
  'saved_for_later',
  'canceled',
])

export const TASK_FILTERS = ['all', 'critical', 'high', 'today', 'completed'] as const
export type TaskFilter = (typeof TASK_FILTERS)[number]

export const isTaskFilter = (value: unknown): value is TaskFilter =>
  typeof value === 'string' && (TASK_FILTERS as readonly string[]).includes(value)

export const isActiveTask = (task: Task): boolean =>
  !INACTIVE_STATUSES.has(task.status ?? 'pending')

export type FilterContext = {
  readonly nowMs: number
  readonly timeZone: string
}

const matches = (task: Task, filter: TaskFilter, context: FilterContext): boolean => {
  switch (filter) {
    case 'all':
      return isActiveTask(task)
    case 'completed':
      return task.status === 'completed'
    case 'today':
      return isActiveTask(task) && isLocalToday(task.due_date, context.nowMs, context.timeZone)
    case 'critical':
    case 'high':
      return isActiveTask(task) && task.priority === filter
    default:
      return assertNever(filter)
  }
}

/** Most recently finished first. Missing dates sort last rather than crashing. */
const byCompletedDateDescending = (a: Task, b: Task): number => {
  const aTime = a.completed_date ? new Date(a.completed_date).getTime() : 0
  const bTime = b.completed_date ? new Date(b.completed_date).getTime() : 0
  return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
}

/**
 * Apply a filter. Input order is preserved for every filter except `completed`,
 * because the list arrives already sorted by `-priority_score` from the server
 * and re-sorting would throw that ranking away.
 */
export const applyTaskFilter = (
  tasks: readonly Task[],
  filter: TaskFilter,
  context: FilterContext,
): readonly Task[] => {
  const matched = tasks.filter((task) => matches(task, filter, context))
  return filter === 'completed' ? [...matched].sort(byCompletedDateDescending) : matched
}

/** Shown when a filter matches nothing. Wording follows the web client. */
export const emptyMessageFor = (filter: TaskFilter): string => {
  switch (filter) {
    case 'completed':
      return 'Nothing completed yet.'
    case 'today':
      return 'Nothing due today.'
    case 'critical':
      return 'No critical tasks.'
    case 'high':
      return 'No high-priority tasks.'
    case 'all':
      return 'No open tasks.'
    default:
      return assertNever(filter)
  }
}
