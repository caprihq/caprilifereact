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
