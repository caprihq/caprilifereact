/**
 * When a scheduled event starts.
 *
 * WHY THIS EXISTS
 *   Marking a task as a scheduled event takes it out of the ranking — it is an
 *   appointment, not work to be ordered. It then belongs in Today's Commitments,
 *   which places an item by `scheduled_start_time ?? due_date`.
 *
 *   Nothing in the app could set `scheduled_start_time`: it was on the entity and in
 *   no form. So an event created with no due date had no anchor at all, and with no
 *   anchor it is dropped from the timeline, from Today's Plan, and from the ranking
 *   it was deliberately excluded from. The task still existed and appeared nowhere
 *   but the full task list.
 *
 * Pure, with the clock passed in, so the rounding can be tested at a fixed instant
 * rather than at whatever moment the suite happens to run (§2.3).
 */

const MINUTES = 30
const MS_PER_MINUTE = 60_000

/**
 * The next half hour, as a sensible default for a new event.
 *
 * A default matters more than its exact value: an event saved with no start time is
 * invisible, so the form must never be able to produce one. Calendars do the same
 * thing — a new event opens at the next round time rather than at nothing.
 *
 * Already on the half hour means the *next* one: offering a start time that has
 * already arrived is not a choice anyone wants.
 */
export const nextHalfHour = (nowMs: number): Date => {
  const slots = Math.floor(nowMs / (MINUTES * MS_PER_MINUTE)) + 1

  return new Date(slots * MINUTES * MS_PER_MINUTE)
}

/** `base`'s day, moved to `time`'s time of day. Seconds are dropped. */
export const withTime = (base: Date, time: Date): Date => {
  const next = new Date(base)
  next.setHours(time.getHours(), time.getMinutes(), 0, 0)

  return next
}

/**
 * The start instant for an event, from the day it is due and the time of day chosen.
 *
 * The web client's shape, and the reason there is no separate date field: the day
 * comes from `due_date`, which the form already asks for, and the event only adds a
 * time of day. `AddTaskSheet.jsx` composes the two exactly this way.
 *
 * One deliberate difference. The web version drops the time when no due date is set
 * — `f.eventTime && f.dueDate ? … : undefined` — so an event given a time but no
 * date is stored with no start at all, and an event with no start appears nowhere.
 * Its own detail sheet does not agree with it, falling back to `new Date()`. Today
 * is the better answer of the two, so it is the one used here.
 */
export const eventStartFrom = (input: {
  readonly dueDate: string | undefined
  readonly time: Date
  readonly nowMs: number
}): string => {
  const due = input.dueDate ? new Date(input.dueDate) : null
  const day = due && !Number.isNaN(due.getTime()) ? due : new Date(input.nowMs)

  return withTime(day, input.time).toISOString()
}
