import { localDayHourInstant, toLocalDateString } from '@/utils/localDate'

/**
 * Dates between AI task capture and the model, in the user's own calendar.
 *
 * WHY THIS EXISTS
 *   The prompt used to say "Today is 2026-11-06T01:00:00.000Z" — UTC. At 7pm in
 *   Chicago that is already tomorrow, so "call mom tomorrow" landed two days out.
 *   And a plain date back from the model, "2026-11-05", is midnight in London when
 *   read with `new Date`: the evening before in the Americas, which put "dinner at
 *   7pm" on yesterday's calendar and out of sight.
 *
 *   So the model is told the user's local date, time and zone, asked for a local
 *   date (and a time only when one was said), and the answer is read back in the
 *   user's zone — never the device's, never UTC.
 *
 * Pure: the clock and zone are arguments (§2.3).
 */

const MINUTE_MS = 60_000

/** "2026-11-05", or "2026-11-05T17:00" — anything after the minutes is ignored. */
const LOCAL_DATE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/

/** "Thursday, 2026-11-05, 9:14 AM (America/Chicago)": what "today" means to the user. */
export const promptClock = (nowMs: number, timeZone: string): string => {
  const now = new Date(nowMs)
  const day = toLocalDateString(now, timeZone)
  try {
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long', timeZone })
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    })
    return `${weekday}, ${day}, ${time} (${timeZone})`
  } catch {
    // An unknown zone must not lose the task; the date alone still anchors "today".
    return day
  }
}

/** How the prompt asks for `due_date`, so the reader below and the request agree. */
export const DUE_DATE_INSTRUCTION =
  '"due_date" is the user\'s local date as "YYYY-MM-DD", or "YYYY-MM-DDTHH:MM" (24-hour, ' +
  'local) only when a deadline time is said; null when no day is mentioned.'

/**
 * The model's `due_date` as an instant, read in the user's zone. A date alone is
 * that day's local midnight — the "no time" convention reminders already follow.
 * Undefined for anything that is not a date, so the caller keeps its fallback.
 */
export const dueDateFromModel = (value: unknown, timeZone: string): string | undefined => {
  if (typeof value !== 'string') return undefined
  const match = LOCAL_DATE.exec(value.trim())
  if (!match?.[1]) return undefined
  const hour = Number(match[2] ?? 0)
  const minute = Number(match[3] ?? 0)
  if (hour > 23 || minute > 59) return undefined
  const instant = localDayHourInstant(match[1], timeZone, hour).getTime() + minute * MINUTE_MS
  return Number.isNaN(instant) ? undefined : new Date(instant).toISOString()
}
