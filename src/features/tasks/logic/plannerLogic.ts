import { isLocalPast, isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'
import { plannedStartMs } from './statedTime'

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

/** Today, in the user's zone, for a planned start that may be missing. */
const isTodayMs = (ms: number | null, nowMs: number, timeZone: string): boolean =>
  ms !== null && isLocalToday(new Date(ms).toISOString(), nowMs, timeZone)

/** Booked for a later day: planned, so neither due work nor carried over. */
const isBookedAhead = (task: Task, nowMs: number, timeZone: string): boolean => {
  const booked = task.scheduled_start_time ? new Date(task.scheduled_start_time).getTime() : NaN
  return !Number.isNaN(booked) && booked > nowMs && !isTodayMs(booked, nowMs, timeZone)
}

/**
 * TODAY'S PLAN (Home) — the tasks with a time today.
 *
 * A booked time, or a time written in the title or notes ("Dinner, 7 PM"), on
 * today's date. Scheduled events are not here: they arrive with the calendar and
 * commitments through the timeline, which Home merges with these.
 *
 * Deliberately narrow. It used to add every task merely *due* today, plus CAPRI's top
 * pick wherever it sat, and showed each beside whatever clock time its record carried
 * — so an overdue task appeared at "1:00 PM" from an earlier day while the planner
 * listed it as carried over. What is due but not planned belongs to Start Here and Up
 * Next; Today's Plan is what the day already holds.
 */
export const filterTodayPlanTasks = (
  tasks: readonly Task[],
  options: { readonly nowMs: number; readonly timeZone: string },
): readonly Task[] => {
  const { nowMs, timeZone } = options
  const startOf = (task: Task) => plannedStartMs(task, timeZone) ?? Number.MAX_SAFE_INTEGER

  return (
    tasks
      .filter(
        (task) =>
          isActive(task) &&
          !task.is_scheduled_event &&
          isTodayMs(plannedStartMs(task, timeZone), nowMs, timeZone),
      )
      // `filter` already returned a copy, so sorting it touches nothing the caller holds.
      .sort((a, b) => startOf(a) - startOf(b))
  )
}

export type DailyPlan = {
  /** Has a start time today, booked or written → placed in a time slot. */
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

    // A time written into the task places it in its block, as a booked one does.
    if (isTodayMs(plannedStartMs(task, timeZone), nowMs, timeZone)) {
      todayScheduled.push(task)
    } else if (isBookedAhead(task, nowMs, timeZone)) {
      // Planned for a later day. Listing it as carried over as well — because its due
      // date has passed — told the user two different things about the same task.
      continue
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

export const asideView = <T>(tasks: readonly T[]): { shown: readonly T[]; hidden: number } => ({
  shown: tasks.slice(0, ASIDE_LIMIT),
  hidden: Math.max(0, tasks.length - ASIDE_LIMIT),
})
