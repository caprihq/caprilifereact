import type { TimelineItem } from '@/features/commitments'
import type { Task } from '@/types/entities'
import { TIME_SLOTS, localHourOf, slotForHour, slotKeyFor } from './timeSlots'
import type { SlotKey, TimeSlot } from './timeSlots'

/**
 * The unified day: work and commitments in the same three blocks.
 *
 * The planner used to show tasks only, while meetings lived in a separate "Today's
 * Commitments" card on Home. Planning a day means seeing both at once — that 2pm
 * meeting is why the afternoon only has room for one more task — so each block now
 * lists everything in it, in time order.
 *
 * `buildTodayTimeline` already merges the three fixed sources (commitments,
 * scheduled-event tasks, Google events) and de-duplicates imported meetings; this
 * only places its items beside the planner's tasks.
 *
 * Pure: the zone is an argument (§2.3).
 */

export type DayRow =
  | { readonly kind: 'task'; readonly key: string; readonly sortMs: number; readonly task: Task }
  | { readonly kind: 'fixed'; readonly key: string; readonly sortMs: number; readonly item: TimelineItem }

export type DayBlock = {
  readonly slot: TimeSlot
  readonly rows: readonly DayRow[]
}

export type UnifiedDay = {
  readonly blocks: readonly DayBlock[]
  /** Whole-day entries — a birthday, a holiday — shown apart from the blocks. */
  readonly allDay: readonly TimelineItem[]
}

const startMs = (task: Task): number => {
  const ms = new Date(task.scheduled_start_time ?? task.due_date ?? '').getTime()
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms
}

const fixedSlot = (item: TimelineItem, timeZone: string): SlotKey | null => {
  const hour = localHourOf(new Date(item.sortMs).toISOString(), timeZone)
  return hour === null ? null : slotForHour(hour)
}

const taskRows = (tasks: readonly Task[], slot: SlotKey, timeZone: string): DayRow[] =>
  tasks
    // A scheduled event is a fixed item: it arrives through the timeline, and
    // drawing it here too would show the same meeting twice.
    .filter((task) => !task.is_scheduled_event && slotKeyFor(task, timeZone) === slot)
    .map((task) => ({ kind: 'task' as const, key: `task-${task.id}`, sortMs: startMs(task), task }))

const fixedRows = (fixed: readonly TimelineItem[], slot: SlotKey, timeZone: string): DayRow[] =>
  fixed
    .filter((item) => !item.allDay && fixedSlot(item, timeZone) === slot)
    .map((item) => ({ kind: 'fixed' as const, key: item.id, sortMs: item.sortMs, item }))

/**
 * Ties go to the fixed item: a meeting at 2pm and a task placed at 2pm read more
 * naturally with the meeting first, since it is the thing that cannot move.
 */
const byTime = (a: DayRow, b: DayRow): number =>
  a.sortMs - b.sortMs || (a.kind === b.kind ? 0 : a.kind === 'fixed' ? -1 : 1)

export const buildUnifiedDay = (input: {
  readonly tasks: readonly Task[]
  readonly fixed: readonly TimelineItem[]
  readonly timeZone: string
}): UnifiedDay => ({
  blocks: TIME_SLOTS.map((slot) => ({
    slot,
    rows: [
      ...taskRows(input.tasks, slot.key, input.timeZone),
      ...fixedRows(input.fixed, slot.key, input.timeZone),
    ].sort(byTime),
  })),
  allDay: input.fixed.filter((item) => item.allDay === true),
})
