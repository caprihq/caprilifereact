/**
 * Hour-of-day options, shared by every preference that asks for one.
 *
 * Work hours and quiet hours both store `HH:mm` and both have to render it as
 * something a person reads ("9 AM"), so the list and its label live here rather
 * than in whichever component happened to need it first.
 */

export type HourOption = { readonly value: string; readonly label: string }

/** `OFF` clears the field. Quiet hours have to be switchable off; work hours do not. */
export const HOUR_OFF = ''

export const HOURS: readonly HourOption[] = Array.from({ length: 24 }, (_, hour) => ({
  value: `${String(hour).padStart(2, '0')}:00`,
  label: new Date(2026, 0, 1, hour).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  }),
}))

export const QUIET_HOURS: readonly HourOption[] = [{ value: HOUR_OFF, label: 'Off' }, ...HOURS]

export const hourLabel = (value: string | undefined): string =>
  HOURS.find((hour) => hour.value === value)?.label ?? 'Not set'

/** Quiet hours read as "Off" rather than "Not set": it is a state, not a gap. */
export const quietHourLabel = (value: string | undefined): string =>
  value ? hourLabel(value) : 'Off'
