import { isLocalToday, localHourInstant } from '@/utils/localDate'
import type { Task } from '@/types/entities'

/**
 * The day as three blocks: morning, afternoon, evening.
 *
 * Ported from the web client's DailyPlannerView. Two deliberate differences, both
 * about the clock:
 *
 * 1. **The hour is read in the user's timezone**, not the device's. The web version
 *    calls `new Date(iso).getHours()`, so a task scheduled for 9am in New York lands
 *    in "Evening" for a traveller whose phone is on Tokyo time — the same class of
 *    bug the planner's date rules were rewritten to avoid.
 * 2. **`nowMs` is an argument.** Nothing here reads `Date.now()`, so every rule is
 *    testable at a fixed instant (§2.3).
 */

export const SLOT_KEYS = ['morning', 'afternoon', 'evening'] as const
export type SlotKey = (typeof SLOT_KEYS)[number]

export type TimeSlot = {
  readonly key: SlotKey
  readonly label: string
  /** The hours it covers, in words, shown under the label. */
  readonly sub: string
  readonly icon: string
  /** Where a task lands when it is dropped into this slot by hand. */
  readonly defaultHour: number
}

/** Boundaries and default hours match the web client exactly. */
export const TIME_SLOTS: readonly TimeSlot[] = [
  { key: 'morning', label: 'Morning', sub: 'Before noon', icon: 'sunny-outline', defaultHour: 9 },
  {
    key: 'afternoon',
    label: 'Afternoon',
    sub: '12pm – 6pm',
    icon: 'partly-sunny-outline',
    defaultHour: 13,
  },
  { key: 'evening', label: 'Evening', sub: 'After 6pm', icon: 'moon-outline', defaultHour: 19 },
]

/** What a task is anchored to: its time block if it has one, else its due date. */
export const anchorOf = (task: Task): string | undefined =>
  task.scheduled_start_time ?? task.due_date

/** The hour of an instant, in the user's zone. */
export const localHourOf = (iso: string, timeZone: string): number | null => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  try {
    return Number.parseInt(
      date.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone }),
      10,
    )
  } catch {
    return date.getHours()
  }
}

export const slotForHour = (hour: number): SlotKey =>
  hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

/** Which block a task belongs to, or null when it has no anchor at all. */
export const slotKeyFor = (task: Task, timeZone: string): SlotKey | null => {
  const anchor = anchorOf(task)
  if (!anchor) return null

  const hour = localHourOf(anchor, timeZone)
  return hour === null ? null : slotForHour(hour)
}

export type ScheduleWindow = {
  /**
   * Optional, because scheduling must not rewrite a deadline.
   *
   * Set only when the task had none. A task already due Friday and planned for
   * Tuesday keeps Friday — writing the start here is what silently replaced real
   * deadlines with the day CAPRI happened to pick.
   */
  readonly due_date?: string
  readonly scheduled_start_time: string
  readonly scheduled_end_time: string
}

/** A task's length in minutes. The web client's fallback, applied in one place. */
export const DEFAULT_DURATION_MINUTES = 30

/**
 * The window a task takes when dropped into a slot today.
 *
 * All three fields are written together, as the web client does: `due_date` keeps
 * the task in "today" queries that only look at due dates, while the scheduled pair
 * is what places it in a block. Writing only one of them is what leaves a task
 * showing in one view and missing from another.
 *
 * "9am" means 9am **where the user is**, which is why this goes through
 * `localHourInstant` rather than `setHours`.
 */
export const windowForSlot = (
  task: Task,
  slot: SlotKey,
  when: { readonly nowMs: number; readonly timeZone: string },
): ScheduleWindow => {
  const hour = TIME_SLOTS.find((entry) => entry.key === slot)?.defaultHour ?? 9
  // In the user's zone, not the device's: `setHours` would make "9am" mean 9am
  // wherever the phone is, which is the whole bug this planner avoids elsewhere.
  const start = localHourInstant(when.nowMs, when.timeZone, hour)

  const minutes = task.estimated_minutes ?? DEFAULT_DURATION_MINUTES
  const end = new Date(start.getTime() + minutes * 60_000)

  return {
    due_date: start.toISOString(),
    scheduled_start_time: start.toISOString(),
    scheduled_end_time: end.toISOString(),
  }
}

/**
 * Tasks a block's picker can offer.
 *
 * Anything unfinished that is not already anchored to today — the web client's rule,
 * `status !== "completed" && !isLocalToday(scheduled_start_time || due_date)`.
 * Offering a task that is already on the day would silently move it between blocks,
 * which reads as the picker duplicating work rather than scheduling it.
 *
 * Scheduled events are excluded too: they come from the calendar, and CAPRI does not
 * own their time.
 */
export const schedulableTasks = (
  tasks: readonly Task[],
  when: { readonly nowMs: number; readonly timeZone: string },
): readonly Task[] =>
  tasks.filter((task) => {
    if (task.status === 'completed' || task.status === 'canceled') return false
    if (task.is_scheduled_event) return false

    const anchor = anchorOf(task)
    return !anchor || !isLocalToday(anchor, when.nowMs, when.timeZone)
  })
