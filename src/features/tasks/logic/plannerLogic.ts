import { isLocalPast, isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'

/**
 * Planning rules — native port of web/src/lib/plannerLogic.js.
 *
 * "Today" is always the user's LOCAL calendar date, compared as a YYYY-MM-DD
 * string rather than by raw UTC timestamps. Comparing timestamps is what makes
 * a task due at 11pm look like tomorrow to someone west of UTC.
 *
 * Changes from the web version:
 *  - The timezone and clock are arguments, not globals (guidelines §2.3).
 *  - No console logging. The original logged an emoji line for every task on
 *    every render, unconditionally, in production (§5.3).
 */

const isActive = (task: Task): boolean => (task.status ?? 'pending') === 'pending'

export type TodayPlan = {
  /** Anchored to today — scheduled or due. Sorted by time. */
  readonly todayTasks: readonly Task[]
  /** The recommended task, when it has no today anchor of its own. */
  readonly recommendedExtra: readonly Task[]
}

/**
 * TODAY'S PLAN (Home) — curated and deliberately narrow.
 *
 * Included: scheduled today · due today · the recommended task.
 * Excluded: future work and overdue carryover, which live in the full planner.
 */
export const filterTodayPlanTasks = (
  tasks: readonly Task[],
  options: {
    readonly nowMs: number
    readonly timeZone: string
    readonly recommendedTaskId?: string | null
  },
): TodayPlan => {
  const { nowMs, timeZone, recommendedTaskId } = options
  const todayTasks: Task[] = []
  const recommendedExtra: Task[] = []

  for (const task of tasks) {
    if (!isActive(task)) continue

    if (
      isLocalToday(task.scheduled_start_time, nowMs, timeZone) ||
      isLocalToday(task.due_date, nowMs, timeZone)
    ) {
      todayTasks.push(task)
    } else if (recommendedTaskId && task.id === recommendedTaskId) {
      recommendedExtra.push(task)
    }
  }

  const sorted = [...todayTasks].sort((a, b) => {
    const aTime = a.scheduled_start_time ?? a.due_date ?? ''
    const bTime = b.scheduled_start_time ?? b.due_date ?? ''
    return new Date(aTime).getTime() - new Date(bTime).getTime()
  })

  return { todayTasks: sorted, recommendedExtra }
}

export type DailyPlan = {
  /** Has a start time today → placed in a time slot. */
  readonly todayScheduled: readonly Task[]
  /** Due today but unscheduled → "Needs attention". */
  readonly needsAttention: readonly Task[]
  /** Anchored in the local past → "Carryover". */
  readonly overdue: readonly Task[]
}

/**
 * DAILY PLANNER — the full view.
 *
 * Free and paid see the same rules; the difference is whether CAPRI's
 * auto-scheduler filled in `scheduled_start_time` in the first place.
 */
export const filterDailyPlannerTasks = (
  tasks: readonly Task[],
  options: { readonly nowMs: number; readonly timeZone: string },
): DailyPlan => {
  const { nowMs, timeZone } = options
  const todayScheduled: Task[] = []
  const needsAttention: Task[] = []
  const overdue: Task[] = []

  for (const task of tasks) {
    if (!isActive(task)) continue

    if (isLocalToday(task.scheduled_start_time, nowMs, timeZone)) {
      todayScheduled.push(task)
    } else if (isLocalToday(task.due_date, nowMs, timeZone)) {
      needsAttention.push(task)
    } else if (
      isLocalPast(task.scheduled_start_time, nowMs, timeZone) ||
      isLocalPast(task.due_date, nowMs, timeZone)
    ) {
      overdue.push(task)
    }
  }

  return { todayScheduled, needsAttention, overdue }
}


/**
 * How much of a planner aside to draw.
 *
 * "Carried over" is every overdue task, and "Needs attention" every task due today
 * without a time — both unbounded. Drawn in full they turn a day plan into a
 * hundred-row scroll, and because the planner is one `ScrollView` every one of those
 * rows is built before the screen appears. Nesting a virtualized list inside a
 * scroll view is not the answer either: React Native disables windowing when you do
 * that, so it costs the same and warns about it.
 *
 * A planner is a summary. It shows the first few and says how many more there are;
 * the full list already exists, one tap away, and it *is* virtualized.
 */
export const ASIDE_LIMIT = 5

export const asideView = <T,>(tasks: readonly T[]): { shown: readonly T[]; hidden: number } => ({
  shown: tasks.slice(0, ASIDE_LIMIT),
  hidden: Math.max(0, tasks.length - ASIDE_LIMIT),
})
