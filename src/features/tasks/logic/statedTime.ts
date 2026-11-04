import { localHourInstant } from '@/utils/localDate'
import type { Task } from '@/types/entities'
import type { ParsedTask } from './parseTaskInput'

/**
 * A clock time the person wrote into a task: "Dinner with friends, 7 PM".
 *
 * WHY THIS EXISTS
 *   A task called "Dinner with friends" with "7 PM" in its notes was ranked as urgent
 *   work and offered as the first thing to do at 10:45 in the morning. The time was
 *   right there; nothing read it. Something that happens *at* a time is an
 *   appointment, and an appointment is not the next thing to start — it is a fixed
 *   point the day is planned around.
 *
 * WHAT COUNTS
 *   "7 PM", "7:30pm", "7 p.m.", "7–9pm" (the start), "noon", and 24-hour times that
 *   cannot be mistaken for anything else ("19:00", "08:30"). A bare "at 7" does not:
 *   it could be morning or evening, and guessing wrong is worse than not guessing.
 *
 *   A deadline is not an appointment. "Send the report by 5pm" says when it must be
 *   finished, not when it happens, so a time after "by", "before", "until" or "due"
 *   is ignored and the task stays ordinary work.
 *
 * The title is read before the notes, and the first time found wins. Pure: the zone
 * and clock are arguments (§2.3).
 */

export type StatedTime = { readonly hour: number; readonly minute: number }

type Found = StatedTime & { readonly index: number }

const DEADLINE_WORDS = /\b(by|before|until|till|due|deadline|no later than)\s*$/i

const MINUTE_MS = 60_000

/** "7–9pm": the start carries the suffix written after the end. */
const RANGE =
  /\b(\d{1,2})(?::([0-5]\d))?\s*(?:-|–|to)\s*\d{1,2}(?::[0-5]\d)?\s*([ap])\.?\s?m\b\.?/gi
const TWELVE_HOUR = /\b(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?\s?m\b\.?/gi
const TWENTY_FOUR_HOUR = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g
const NOON = /\bnoon\b/gi

const twelveHour = (hour: number, suffix: string): number | null => {
  if (hour < 1 || hour > 12) return null
  const base = hour % 12
  return suffix.toLowerCase() === 'p' ? base + 12 : base
}

const matchesOf = (pattern: RegExp, text: string): RegExpExecArray[] => [
  ...text.matchAll(pattern),
]

const candidates = (text: string): Found[] => [
  ...[...matchesOf(RANGE, text), ...matchesOf(TWELVE_HOUR, text)].flatMap((match) => {
    const hour = twelveHour(Number(match[1]), match[3] ?? '')
    return hour === null ? [] : [{ hour, minute: Number(match[2] ?? 0), index: match.index }]
  }),
  ...matchesOf(TWENTY_FOUR_HOUR, text).flatMap((match) => {
    const raw = match[1] ?? ''
    const hour = Number(raw)
    // "7:30" alone is ambiguous; "19:00" and "07:30" are not.
    const unambiguous = hour >= 13 || raw.startsWith('0')
    const followedBySuffix = /^\s*[ap]\.?\s?m/i.test(text.slice(match.index + match[0].length))
    return unambiguous && !followedBySuffix
      ? [{ hour, minute: Number(match[2] ?? 0), index: match.index }]
      : []
  }),
  ...matchesOf(NOON, text).map((match) => ({ hour: 12, minute: 0, index: match.index })),
]

const isDeadline = (text: string, index: number): boolean =>
  DEADLINE_WORDS.test(text.slice(Math.max(0, index - 20), index))

/** The first appointment time in a piece of text, or null. */
export const statedTimeIn = (text: string | undefined | null): StatedTime | null => {
  if (!text) return null
  const [first] = candidates(text)
    .filter((found) => !isDeadline(text, found.index))
    .sort((a, b) => a.index - b.index)
  return first ? { hour: first.hour, minute: first.minute } : null
}

/** The task's stated time, title first. Base44 sends a never-written description as null. */
export const statedTimeOf = (task: Pick<Task, 'title' | 'description'>): StatedTime | null =>
  statedTimeIn(task.title) ??
  statedTimeIn(typeof task.description === 'string' ? task.description : null)

/** The stated time on a given day, as an instant in the user's zone. */
const atTime = (dayMs: number, time: StatedTime, timeZone: string): number =>
  localHourInstant(dayMs, timeZone, time.hour).getTime() + time.minute * MINUTE_MS

/**
 * When a task with a stated time happens: that time on its due day.
 *
 * Only with a due date. "Dinner 7 PM" with no day could be any evening, and pinning
 * it to today would put it back on every Today's Plan until it is ticked off.
 */
export const statedStartMs = (
  task: Pick<Task, 'title' | 'description' | 'due_date'>,
  timeZone: string,
): number | null => {
  const time = statedTimeOf(task)
  const dueMs = task.due_date ? new Date(task.due_date).getTime() : NaN
  return time && !Number.isNaN(dueMs) ? atTime(dueMs, time, timeZone) : null
}

/**
 * Happens at a time, so it is planned around rather than ranked as work.
 *
 * A scheduled event, or a task whose title or notes give the time it happens.
 */
export const isAppointment = (
  task: Pick<Task, 'title' | 'description' | 'due_date' | 'is_scheduled_event'>,
  timeZone: string,
): boolean => task.is_scheduled_event === true || statedStartMs(task, timeZone) !== null

/**
 * When a task sits in the day: its booked start, else the time its title or notes
 * give. Null for flexible work with neither.
 */
export const plannedStartMs = (
  task: Pick<Task, 'title' | 'description' | 'due_date' | 'scheduled_start_time'>,
  timeZone: string,
): number | null => {
  const booked = task.scheduled_start_time ? new Date(task.scheduled_start_time).getTime() : NaN
  return Number.isNaN(booked) ? statedStartMs(task, timeZone) : booked
}

/**
 * A captured task that names a time becomes a scheduled event at that time.
 *
 * "Dinner with friends at 7pm" is something that happens at 7, so it is saved as one
 * rather than as work to rank. On its due day when it has one; otherwise the next
 * 7pm, which is tonight unless tonight's has passed. The confirm step shows the
 * result before anything is saved, and the switch there turns it back.
 *
 * Leaves alone a draft that already has an opinion about being an event.
 */
export const withStatedTime = (
  draft: ParsedTask,
  input: string,
  when: { readonly nowMs: number; readonly timeZone: string },
): ParsedTask => {
  if (draft.is_scheduled_event !== undefined || draft.scheduled_start_time) return draft
  const time =
    statedTimeIn(input) ?? statedTimeIn(draft.title) ?? statedTimeIn(draft.description)
  if (!time) return draft

  const dueMs = draft.due_date ? new Date(draft.due_date).getTime() : NaN
  const tonight = atTime(when.nowMs, time, when.timeZone)
  const startMs = Number.isNaN(dueMs)
    ? tonight > when.nowMs
      ? tonight
      : atTime(when.nowMs + 24 * 60 * MINUTE_MS, time, when.timeZone)
    : atTime(dueMs, time, when.timeZone)
  const start = new Date(startMs).toISOString()

  return {
    ...draft,
    is_scheduled_event: true,
    scheduled_start_time: start,
    due_date: draft.due_date ?? start,
  }
}
