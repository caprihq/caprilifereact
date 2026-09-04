/**
 * Local-calendar date comparison.
 *
 * "Today" is always the user's LOCAL calendar date, compared as a YYYY-MM-DD
 * string rather than by raw UTC timestamps. Comparing timestamps is what makes a
 * task due at 11pm look like tomorrow to someone west of UTC.
 *
 * Lives in utils because both the tasks and commitments features need it — it
 * was inside `features/tasks/logic/plannerLogic`, which is the last thing that
 * made commitments depend on tasks. The planner *rules* stay in tasks; only
 * these date primitives moved.
 *
 * The clock and the zone are always arguments. Nothing here reads Date.now().
 */

/** YYYY-MM-DD in the given IANA zone. 'en-CA' is the locale that formats that way. */
export const toLocalDateString = (date: Date, timeZone: string): string => {
  try {
    return date.toLocaleDateString('en-CA', { timeZone })
  } catch {
    // An invalid zone must not take the screen down; fall back to device local.
    return date.toLocaleDateString('en-CA')
  }
}

export const isLocalToday = (
  iso: string | undefined,
  nowMs: number,
  timeZone: string,
): boolean => {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  return toLocalDateString(date, timeZone) === toLocalDateString(new Date(nowMs), timeZone)
}

export const isLocalPast = (
  iso: string | undefined,
  nowMs: number,
  timeZone: string,
): boolean => {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  if (isLocalToday(iso, nowMs, timeZone)) return false // today is never "past"
  return date.getTime() < nowMs
}

/**
 * How many minutes ahead of UTC `timeZone` is at a given instant.
 *
 * Formatting the instant in the zone and reading it back as though it were UTC
 * gives the offset by subtraction. Doing it per instant rather than per zone is
 * what makes it correct across a DST boundary.
 */
export const zoneOffsetMinutes = (date: Date, timeZone: string): number => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date)

    const value = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((part) => part.type === type)?.value ?? '0')

    // Some ICU builds render midnight as hour 24.
    const hour = value('hour') % 24
    const asUtc = Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      hour,
      value('minute'),
      value('second'),
    )

    return (asUtc - date.getTime()) / 60_000
  } catch {
    // An unknown zone must not take the screen down; device local is the honest
    // fallback, and matches what every other helper here does.
    return -date.getTimezoneOffset()
  }
}

/**
 * Today, at `hour`:00 **in the user's zone**, as an instant.
 *
 * The obvious version — `date.setHours(hour, 0, 0, 0)` — sets the hour in the
 * *device's* zone, so "9am" means 9am wherever the phone happens to be rather than
 * where the user is. That is the bug this exists to avoid, and a test catches it.
 *
 * Resolved twice because the offset depends on the instant it is measured at, and
 * the first guess can land on the wrong side of a DST change.
 */
export const localHourInstant = (nowMs: number, timeZone: string, hour: number): Date => {
  const [year = 1970, month = 1, day = 1] = toLocalDateString(new Date(nowMs), timeZone)
    .split('-')
    .map(Number)

  const guess = Date.UTC(year, month - 1, day, hour)
  const firstOffset = zoneOffsetMinutes(new Date(guess), timeZone)
  const candidate = guess - firstOffset * 60_000
  const settledOffset = zoneOffsetMinutes(new Date(candidate), timeZone)

  return new Date(settledOffset === firstOffset ? candidate : guess - settledOffset * 60_000)
}
