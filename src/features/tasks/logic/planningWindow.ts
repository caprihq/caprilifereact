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

export const planningWindow = (user: User | undefined): string => {
  const start = user?.work_hours_start ?? DEFAULT_START
  const end = user?.work_hours_end ?? DEFAULT_END

  return `CAPRI plans between ${hourLabel(start)} and ${hourLabel(end)}.`
}
