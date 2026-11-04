import { hourLabel } from '@/features/profile/logic/hours'
import type { User } from '@/types/entities'

/**
 * The hours CAPRI will actually plan into, in the user's own words.
 *
 * This line used to read "CAPRI plans between 9am and 6pm" — hardcoded, and wrong
 * for anyone who had set their hours. The Profile screen two taps away said 9 AM to
 * 5 PM at the same moment. A caption that contradicts a setting the user just chose
 * is worse than no caption: it teaches them the settings do not matter.
 *
 * Falls back to naming the default rather than inventing hours, so an account that
 * has never answered still gets a true sentence.
 */

export const DEFAULT_START = '09:00'
export const DEFAULT_END = '18:00'

/**
 * The personal day: when Plan My Day may place anything that is not work.
 *
 * Mirrors `PERSONAL_START` / `PERSONAL_END` in the backend's autoScheduleTasks, and
 * like it always contains the work hours. The caption used to name the work hours
 * alone, so a personal task placed at 4:30pm read as CAPRI breaking its own rule.
 */
export const PERSONAL_START = '07:00'
export const PERSONAL_END = '22:00'

const minutesOf = (clock: string): number => {
  const [hour = 0, minute = 0] = clock.split(':').map(Number)
  return hour * 60 + minute
}

const earlier = (a: string, b: string): string => (minutesOf(a) <= minutesOf(b) ? a : b)
const later = (a: string, b: string): string => (minutesOf(a) >= minutesOf(b) ? a : b)

export const planningWindow = (user: User | undefined): string => {
  const start = user?.work_hours_start ?? DEFAULT_START
  const end = user?.work_hours_end ?? DEFAULT_END
  const personalStart = earlier(PERSONAL_START, start)
  const personalEnd = later(PERSONAL_END, end)

  return (
    `Work tasks go between ${hourLabel(start)} and ${hourLabel(end)}. ` +
    `Personal plans can go between ${hourLabel(personalStart)} and ${hourLabel(personalEnd)}.`
  )
}
