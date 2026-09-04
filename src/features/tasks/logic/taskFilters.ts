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
 * Statuses that do not count as open work.
 *
 * **`in_progress` is deliberately NOT here, unlike the web client.** Its list
 * treats a started task as inactive, so a task you are in the middle of doing
 * vanishes from every list at once: not in All, not in Today, not under a priority
 * chip, and not in Done either, because Done means `completed`. The web client gets
 * away with it because its NextTaskSheet is what sets the status and shows the task
 * back to you. Nothing in this app sets `in_progress` at all, so any task carrying
 * it — set on the web, or by an earlier version — is simply unreachable here, with
 * no way to complete, defer or cancel it. A task being worked on is the most active
 * thing there is, so it stays in the lists.
 */
export const INACTIVE_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'saved_for_later',
  'canceled',
])

/**
 * One chip per priority, plus the states work can be in.
 *
 * **Every priority is filterable.** The bar used to offer Critical and High only,
 * so a task set to Medium — the default the form applies — could not be filtered
 * for at all, and the two lists disagreed about what priorities exist.
 *
 * `later` exists so deferred work is retrievable: swiping Later sets
 * `saved_for_later`, which is correctly inactive, and with no filter for it the task
 * left every list permanently while the undo toast is gone within seconds.
 * Deferring postpones something; it does not destroy it.
 */
export const TASK_FILTERS = [
  'all',
  'today',
  'critical',
  'high',
  'medium',
  'low',
  'later',
  'completed',
] as const
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
      // Everything, including finished and cancelled work. "All" that hides most of
      // a list is a filter pretending to be the absence of one; the sort sinks
      // completed tasks to the bottom rather than dropping them.
      return true
    case 'completed':
      return task.status === 'completed'
    case 'later':
      return task.status === 'saved_for_later'
    case 'today':
      return isActiveTask(task) && isLocalToday(task.due_date, context.nowMs, context.timeZone)
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
      // Priority chips show open work only: a completed critical task is history,
      // and Done is where history lives.
      return isActiveTask(task) && (task.priority ?? 'medium') === filter
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
 * Ranking used by the task list, ported from the web client's inline sort.
 *
 * Three tiers, in this order:
 *   1. Completed work sinks, whatever else it scores.
 *   2. Priority band — critical before high before medium before low.
 *   3. `priority_score` descending inside a band.
 *
 * The server already returns `-priority_score` order, but that alone puts a
 * high-scoring *low* priority task above a critical one, which reads as broken.
 */
const PRIORITY_ORDER: Readonly<Record<string, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const bandOf = (task: Task): number => PRIORITY_ORDER[task.priority ?? 'medium'] ?? 4

const byPriorityThenScore = (a: Task, b: Task): number => {
  const completedA = a.status === 'completed' ? 1 : 0
  const completedB = b.status === 'completed' ? 1 : 0
  if (completedA !== completedB) return completedA - completedB

  // Between two finished tasks, priority is history — what matters is which was
  // finished most recently, the same order the Done tab uses.
  if (completedA === 1) return byCompletedDateDescending(a, b)

  const band = bandOf(a) - bandOf(b)
  if (band !== 0) return band

  return (b.priority_score ?? 0) - (a.priority_score ?? 0)
}

/**
 * Apply a filter, then order the result.
 *
 * `completed` sorts by when work finished; everything else by priority band and
 * then score, which is what the web client does. Leaving the server's
 * `-priority_score` order alone was not good enough: it ranks a high-scoring low
 * priority task above a critical one, and a list that puts "low" at the top reads
 * as broken however defensible the score is.
 */
export const applyTaskFilter = (
  tasks: readonly Task[],
  filter: TaskFilter,
  context: FilterContext,
): readonly Task[] => {
  const matched = tasks.filter((task) => matches(task, filter, context))
  return [...matched].sort(filter === 'completed' ? byCompletedDateDescending : byPriorityThenScore)
}

/** Shown when a filter matches nothing. Wording follows the web client. */
export const emptyMessageFor = (filter: TaskFilter): string => {
  switch (filter) {
    case 'completed':
      return 'Nothing completed yet.'
    case 'later':
      return 'Nothing saved for later.'
    case 'today':
      return 'Nothing due today.'
    case 'critical':
      return 'No critical tasks.'
    case 'high':
      return 'No high-priority tasks.'
    case 'medium':
      return 'No medium-priority tasks.'
    case 'low':
      return 'No low-priority tasks.'
    case 'all':
      return 'Nothing here yet.'
    default:
      return assertNever(filter)
  }
}
