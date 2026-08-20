import { isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'

/**
 * Headline counts — native port of web/src/components/tasks/QuickStats.jsx.
 *
 * TWO DELIBERATE CHANGES FROM THE WEB VERSION
 *
 * 1. The clock and timezone are arguments. The web version called `new Date()`
 *    during render, once per task (§2.3).
 * 2. "Due today" respects the user's timezone. The web version compared
 *    `toDateString()` values, which is device-local — so a task due at 11pm
 *    looked like tomorrow to anyone west of UTC.
 *
 * One pass over the list rather than the web version's four `.filter()` calls.
 */

export type TaskStats = {
  readonly pending: number
  readonly inProgress: number
  readonly dueToday: number
  readonly critical: number
}

export const EMPTY_STATS: TaskStats = {
  pending: 0,
  inProgress: 0,
  dueToday: 0,
  critical: 0,
}

export const computeTaskStats = (
  tasks: readonly Task[],
  options: { readonly nowMs: number; readonly timeZone: string },
): TaskStats => {
  const { nowMs, timeZone } = options
  let pending = 0
  let inProgress = 0
  let dueToday = 0
  let critical = 0

  for (const task of tasks) {
    const status = task.status ?? 'pending'
    if (status === 'pending') pending += 1
    if (status === 'in_progress') inProgress += 1
    if (status !== 'completed' && isLocalToday(task.due_date, nowMs, timeZone)) dueToday += 1
    if (status !== 'completed' && task.priority === 'critical') critical += 1
  }

  return { pending, inProgress, dueToday, critical }
}
