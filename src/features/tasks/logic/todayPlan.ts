import type { TimelineItem } from '@/features/commitments'
import type { Task } from '@/types/entities'
import { plannedStartMs } from './statedTime'
import { DEFAULT_DURATION_MINUTES } from './timeSlots'

/**
 * Today's Plan on Home: one list of what the day already holds.
 *
 * It used to be two cards. "Today's Plan" listed tasks, and "Today's Commitments"
 * listed meetings and appointments underneath, so a 2pm meeting and the task booked
 * at 3pm read as unrelated. They are the same question — what is fixed today — and
 * now share one list in time order: commitments, calendar events and scheduled
 * events from the timeline, plus the tasks the person booked or wrote a time into.
 *
 * What has already finished drops off, so at 4pm the card shows the evening rather
 * than a morning that is over. All-day entries stay at the top all day.
 *
 * Pure: the clock and zone are arguments (§2.3).
 */

/** Home is a summary; the planner holds the rest. */
export const MAX_PLAN_ROWS = 4

export type TodayPlan = {
  /** What to draw: all-day entries, then what has not finished yet. */
  readonly rows: readonly TimelineItem[]
  /** Still to come, but past the row limit. */
  readonly hidden: number
  /** Everything today, finished or not — so "nothing left" can differ from "nothing planned". */
  readonly total: number
}

const MINUTE_MS = 60_000

const clock = (ms: number, timeZone: string): string =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })

/** A task with a time today, as a row beside the fixed items. */
const taskItem = (task: Task, timeZone: string): TimelineItem | null => {
  const start = plannedStartMs(task, timeZone)
  if (start === null) return null
  const booked = task.scheduled_end_time ? new Date(task.scheduled_end_time).getTime() : NaN
  const end = Number.isNaN(booked)
    ? start + (task.estimated_minutes ?? DEFAULT_DURATION_MINUTES) * MINUTE_MS
    : booked
  return {
    id: `plan-${task.id}`,
    sortMs: start,
    title: task.title,
    timeLabel: clock(start, timeZone),
    source: 'task',
    endMs: end,
    task,
  }
}

export const buildTodayPlan = (input: {
  /** Today's timeline: commitments, calendar events and scheduled events. */
  readonly fixed: readonly TimelineItem[]
  /** Tasks with a time today — `filterTodayPlanTasks`. */
  readonly tasks: readonly Task[]
  readonly nowMs: number
  readonly timeZone: string
}): TodayPlan => {
  const allDay = input.fixed.filter((item) => item.allDay === true)
  const timed = [
    ...input.fixed.filter((item) => item.allDay !== true),
    ...input.tasks.flatMap((task) => taskItem(task, input.timeZone) ?? []),
  ].sort((a, b) => a.sortMs - b.sortMs)

  const upcoming = [
    ...allDay,
    ...timed.filter((item) => (item.endMs ?? item.sortMs) > input.nowMs),
  ]

  return {
    rows: upcoming.slice(0, MAX_PLAN_ROWS),
    hidden: Math.max(0, upcoming.length - MAX_PLAN_ROWS),
    total: allDay.length + timed.length,
  }
}
