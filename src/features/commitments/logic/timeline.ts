import { isLocalToday } from '@/utils/localDate'
import type { CalendarEvent, Commitment, Task } from '@/types/entities'

/**
 * Today's commitments, merged into one ordered timeline — native port of
 * web/src/components/commitments/TodayCommitmentsCard.jsx.
 *
 * Three sources agree on a single ordering: manual Commitment records, tasks
 * flagged `is_scheduled_event`, and Google Calendar events.
 *
 * FOUR DELIBERATE CHANGES FROM THE WEB VERSION
 *
 * 1. Calendar events sort correctly. The web read `e.start?.dateTime`, but the
 *    backend already flattened `start` to a string, so every event's sort key
 *    was `new Date(undefined)` — an Invalid Date. Mixed in with real dates that
 *    made the merged order arbitrary. See the note on `CalendarEvent`.
 * 2. "Today" is the user's local date via `isLocalToday`, not date-fns
 *    `isToday`, which uses the device timezone.
 * 3. Pure. The web version was three `useQuery` calls, a `subscribe()` effect
 *    and the merge, all inside the component (§2.3, §3.3).
 * 4. Unreadable dates are dropped rather than sorted as NaN.
 */

export type TimelineItem = {
  /** Unique across sources, so it is safe as a React key. */
  readonly id: string
  readonly sortMs: number
  readonly title: string
  /** e.g. "9:00 AM – 10:00 AM", or null when there is no usable time. */
  readonly timeLabel: string | null
  readonly source: 'commitment' | 'task' | 'calendar'
  readonly location?: string | null
  /** Present for internal rows, so the caller can open the underlying record. */
  readonly commitment?: Commitment
  readonly task?: Task
}

export type TimelineInput = {
  readonly commitments: readonly Commitment[]
  readonly tasks: readonly Task[]
  readonly events: readonly CalendarEvent[]
  readonly nowMs: number
  readonly timeZone: string
}

/** "9:00 AM" in the user's zone, or null when the input is unusable. */
export const formatTimeOfDay = (iso: string | undefined, timeZone: string): string | null => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  try {
    return date.toLocaleTimeString('en-US', { ...options, timeZone })
  } catch {
    // An invalid zone must not blank the row; fall back to device local.
    return date.toLocaleTimeString('en-US', options)
  }
}

/** "9:00 AM – 10:00 AM", collapsing to just the start when the end is unusable. */
const rangeLabel = (
  startIso: string | undefined,
  endIso: string | undefined,
  timeZone: string,
): string | null => {
  const start = formatTimeOfDay(startIso, timeZone)
  if (!start) return null
  const end = formatTimeOfDay(endIso, timeZone)
  return end ? `${start} – ${end}` : start
}

const msOf = (iso: string | undefined): number | null => {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** The time a scheduled-event task is anchored to. */
const taskAnchor = (task: Task): string | undefined => task.scheduled_start_time ?? task.due_date

const fromCommitments = (input: TimelineInput): readonly TimelineItem[] =>
  input.commitments.flatMap((commitment) => {
    if (!isLocalToday(commitment.start_time, input.nowMs, input.timeZone)) return []
    const sortMs = msOf(commitment.start_time)
    if (sortMs === null) return []
    return [
      {
        id: `commitment-${commitment.id}`,
        sortMs,
        title: commitment.title,
        timeLabel: rangeLabel(commitment.start_time, commitment.end_time, input.timeZone),
        source: 'commitment' as const,
        commitment,
      },
    ]
  })

const fromScheduledTasks = (input: TimelineInput): readonly TimelineItem[] =>
  input.tasks.flatMap((task) => {
    if (!task.is_scheduled_event || task.status === 'completed') return []
    const anchor = taskAnchor(task)
    if (!isLocalToday(anchor, input.nowMs, input.timeZone)) return []
    const sortMs = msOf(anchor)
    if (sortMs === null) return []
    return [
      {
        id: `task-${task.id}`,
        sortMs,
        title: task.title,
        timeLabel: formatTimeOfDay(anchor, input.timeZone),
        source: 'task' as const,
        task,
      },
    ]
  })

const fromCalendar = (input: TimelineInput): readonly TimelineItem[] =>
  input.events.flatMap((event) => {
    if (!isLocalToday(event.start, input.nowMs, input.timeZone)) return []
    const sortMs = msOf(event.start)
    if (sortMs === null) return []
    return [
      {
        id: `calendar-${event.id}`,
        sortMs,
        title: event.title,
        timeLabel: event.allDay ? 'All day' : rangeLabel(event.start, event.end, input.timeZone),
        source: 'calendar' as const,
        location: event.location ?? null,
      },
    ]
  })

/** Everything happening today, earliest first. */
export const buildTodayTimeline = (input: TimelineInput): readonly TimelineItem[] =>
  [...fromCommitments(input), ...fromScheduledTasks(input), ...fromCalendar(input)].sort(
    (a, b) => a.sortMs - b.sortMs,
  )
