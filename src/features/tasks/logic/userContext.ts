import { isLocalToday } from '@/utils/localDate'
import type { CalendarEvent, Commitment, FocusTime, User } from '@/types/entities'

/**
 * Who the user is, as the model needs to hear it.
 *
 * Ported from the web client's `buildUserContext`. Three of its AI features prepend
 * this block to their prompts, and it is what makes CAPRI's judgements *load-aware*:
 * knowing someone already has six hours booked changes what should rank first, and
 * without it the model reasons about a list of tasks in a vacuum.
 *
 * Our recommendation prompt shipped without it — same scoring rules as the web,
 * materially less context — so Up Next was quietly the weaker feature.
 *
 * Pure: every input is passed in, including the clock, so the same day can be
 * described identically in a test (§2.3).
 */

export type ContextInput = {
  readonly user: User | undefined
  readonly focusTimes: readonly FocusTime[]
  readonly commitments: readonly Commitment[]
  readonly calendarEvents: readonly CalendarEvent[]
  readonly nowMs: number
  readonly timeZone: string
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const clock = (iso: string, timeZone: string): string =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone })

const minutesBetween = (start: string, end: string): number => {
  const span = (new Date(end).getTime() - new Date(start).getTime()) / 60_000
  return Number.isFinite(span) && span > 0 ? span : 0
}

/**
 * How full the day already is.
 *
 * The thresholds are the web client's. They exist so the model reasons about
 * *capacity* rather than a raw minute count, which it has no scale for.
 */
export const loadLevelFor = (committedMinutes: number): string => {
  if (committedMinutes >= 300) return 'heavy (5+ hours committed)'
  if (committedMinutes >= 150) return 'moderate (2.5-5 hours committed)'
  if (committedMinutes > 0) return 'light (under 2.5 hours committed)'
  return 'free (no commitments today)'
}

const focusSchedule = (focusTimes: readonly FocusTime[]): readonly string[] =>
  focusTimes
    .filter((block) => block.days.length > 0)
    .map((block) => {
      const days = block.days.map((day) => DAY_NAMES[day] ?? '?').join(', ')
      const energy = block.energy_level ?? 'medium'
      return `${block.label} (${days} ${block.start_time}-${block.end_time}, ${block.priority_level ?? 'flexible'}, ${energy} energy)`
    })

/** Today's commitments and calendar events, as one list of busy blocks. */
const busyToday = (input: ContextInput): readonly { label: string; minutes: number }[] => {
  const { commitments, calendarEvents, nowMs, timeZone } = input

  const fromCommitments = commitments
    .filter((entry) => isLocalToday(entry.start_time, nowMs, timeZone))
    .map((entry) => ({
      label: `- ${entry.title} (${clock(entry.start_time, timeZone)} - ${clock(entry.end_time, timeZone)})`,
      minutes: minutesBetween(entry.start_time, entry.end_time),
    }))

  const fromCalendar = calendarEvents
    // All-day events carry no times, so they cannot be counted as committed hours.
    .filter((event) => !event.allDay && isLocalToday(event.start, nowMs, timeZone))
    .map((event) => ({
      label: `- ${event.title} (${clock(event.start, timeZone)} - ${clock(event.end, timeZone)})`,
      minutes: minutesBetween(event.start, event.end),
    }))

  return [...fromCommitments, ...fromCalendar]
}

/**
 * The user's stated preferences.
 *
 * Every field has a spoken fallback rather than being omitted: "Not set" tells the
 * model it may choose, where a missing line reads as an oversight it should guess at.
 */
const workHours = (user: User | undefined): string =>
  user?.work_hours_start && user.work_hours_end
    ? `${user.work_hours_start} - ${user.work_hours_end}`
    : 'Not set'

const energyPeaks = (user: User | undefined): string =>
  user?.energy_peak_hours && user.energy_peak_hours.length > 0
    ? `${user.energy_peak_hours.join(', ')}:00`
    : 'Not specified'

const preferences = (user: User | undefined): string =>
  `- Timezone: ${user?.timezone ?? 'Not set'}
- Work Hours: ${workHours(user)}
- Peak Energy Hours: ${energyPeaks(user)}
- Preferred Task Duration: ${user?.preferred_task_duration ?? 'mixed'}
- Context Switch Tolerance: ${user?.context_switch_tolerance ?? 'medium'}
- Priority Categories: ${user?.priority_categories?.join(', ') || 'Not specified'}`

export const buildContextSummary = (input: ContextInput): string => {
  const blocks = focusSchedule(input.focusTimes)
  const busy = busyToday(input)
  const committed = busy.reduce((total, entry) => total + entry.minutes, 0)

  return `User Preferences:
${preferences(input.user)}

Focus Time Blocks:
${blocks.length > 0 ? blocks.join('\n') : 'None configured'}

Today's Schedule & Availability:
- Day load: ${loadLevelFor(committed)}
- Total committed time: ${String(Math.round(committed))} minutes
${busy.length > 0 ? busy.map((entry) => entry.label).join('\n') : '- No commitments or calendar events today'}

IMPORTANT: Use today's schedule to avoid recommending tasks that would overload the user. On heavy days, prioritize shorter, lower-effort tasks. On free days, surface high-priority and deep work tasks.`
}
