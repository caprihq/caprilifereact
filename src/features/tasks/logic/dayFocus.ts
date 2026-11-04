import { isActiveTask } from './taskFilters'
import { isAppointment } from './statedTime'
import { DEFAULT_DURATION_MINUTES } from './timeSlots'
import type { Task } from '@/types/entities'

/**
 * Which tasks Start Here and Up Next choose from, so they agree with Today's Plan.
 *
 * Home used to give four signals about the same day that did not line up: Start Here
 * recommended a dinner booked for 7 PM, Up Next listed a task already planned for 1 PM,
 * and Today's Plan showed that same task again. Each section now answers its own
 * question, and a task appears in one place:
 *
 *  - **Today's Plan** — what already has a time: fixed commitments, and tasks the
 *    person booked or wrote a time into.
 *  - **Start Here** — the task booked for right now, if there is one (the plan already
 *    decided, so it is not overruled); otherwise CAPRI's pick of the unplanned work.
 *  - **Up Next** — the unplanned work behind it.
 *
 * Pure: the clock and zone are arguments (§2.3).
 */

type When = { readonly nowMs: number; readonly timeZone: string }

const MINUTE_MS = 60_000

/** A flexible task's booked window, when it has one. */
const bookedWindow = (task: Task): { readonly start: number; readonly end: number } | null => {
  const start = task.scheduled_start_time ? new Date(task.scheduled_start_time).getTime() : NaN
  if (Number.isNaN(start)) return null
  const end = task.scheduled_end_time ? new Date(task.scheduled_end_time).getTime() : NaN
  const fallback = start + (task.estimated_minutes ?? DEFAULT_DURATION_MINUTES) * MINUTE_MS
  return { start, end: Number.isNaN(end) || end <= start ? fallback : end }
}

/** Booked for later — today or another day. It waits for its time. */
const isBookedLater = (task: Task, nowMs: number): boolean => {
  const window = bookedWindow(task)
  return window !== null && window.start > nowMs
}

/** The open, flexible task whose booked time is now, if any. The earliest wins. */
export const currentTask = (tasks: readonly Task[], when: When): Task | null => {
  const now = tasks.filter((task) => {
    if (!isActiveTask(task) || isAppointment(task, when.timeZone)) return false
    const window = bookedWindow(task)
    return window !== null && window.start <= when.nowMs && when.nowMs < window.end
  })
  return now.reduce<Task | null>((first, task) => {
    const start = bookedWindow(task)?.start ?? Infinity
    const firstStart = first ? (bookedWindow(first)?.start ?? Infinity) : Infinity
    return start < firstStart ? task : first
  }, null)
}

/**
 * Work CAPRI may rank: open, not an appointment, and not waiting for a booked time.
 *
 * A task whose booked time has passed without being done is back in the running —
 * the plan did not happen, and the work still needs doing.
 */
export const rankableTasks = (tasks: readonly Task[], when: When): readonly Task[] => {
  const current = currentTask(tasks, when)
  return tasks.filter(
    (task) =>
      isActiveTask(task) &&
      !isAppointment(task, when.timeZone) &&
      !isBookedLater(task, when.nowMs) &&
      task.id !== current?.id,
  )
}

/** Start Here's line for a task booked for now: when the block ends. */
export const currentReason = (task: Task, timeZone: string): string => {
  const window = bookedWindow(task)
  if (!window) return 'Planned for now.'
  const until = new Date(window.end).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })
  return `Planned for now, until ${until}.`
}

/** A recommendation as Home shows it: the task and CAPRI's line about it. */
export type Pick = { readonly task: Task; readonly reason: string }

export type HomeFocus = {
  readonly hero: Task | null
  /** Start Here's line; null leaves the card to its own fallback. */
  readonly reason: string | null
  readonly queue: readonly Pick[]
}

/** Up Next's rows. */
const QUEUE_SIZE = 3

/**
 * What Start Here and Up Next show, decided once for Home and the widget alike.
 *
 * The clock wins when it has an answer: a task booked for right now is Start Here,
 * and CAPRI's own pick leads Up Next instead of disappearing. Otherwise CAPRI's pick
 * when it has answered, and the local ranking until then.
 */
export const homeFocus = (input: {
  readonly current: Task | null
  /** CAPRI's pick, once the model has answered. */
  readonly pick: Pick | null
  /** The local ranking's pick, shown until then and whenever the model cannot answer. */
  readonly fallback: Task | null
  readonly queue: readonly Pick[]
  readonly timeZone: string
}): HomeFocus => {
  if (input.current) {
    return {
      hero: input.current,
      reason: currentReason(input.current, input.timeZone),
      queue: input.pick ? [input.pick, ...input.queue].slice(0, QUEUE_SIZE) : input.queue,
    }
  }
  return {
    hero: input.pick?.task ?? input.fallback,
    reason: input.pick?.reason ?? null,
    queue: input.queue,
  }
}
