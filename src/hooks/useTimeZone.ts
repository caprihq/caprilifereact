import { useCurrentUser } from '@/services/api'

/**
 * The user's IANA zone, falling back to the device's.
 *
 * Exists so a screen that only needs to *format a date* does not have to pull in
 * the whole task feed — ranking, planner grouping, behavioural signals and a live
 * clock — to get one string. `useTaskFeed` still derives the same value the same
 * way for the screens that genuinely need the feed.
 */
export const useTimeZone = (): string => {
  const { data: user } = useCurrentUser()

  return user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
}
