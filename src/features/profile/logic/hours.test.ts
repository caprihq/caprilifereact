import { HOURS, QUIET_HOURS, hourLabel, quietHourLabel } from './hours'

describe('hour options', () => {
  it('covers the whole day in the format the backend stores', () => {
    expect(HOURS).toHaveLength(24)
    expect(HOURS[0]?.value).toBe('00:00')
    expect(HOURS[23]?.value).toBe('23:00')
    // The reminder sweep parses HH:mm; anything else reads as "not set" and
    // silently disables quiet hours.
    for (const hour of HOURS) expect(hour.value).toMatch(/^\d{2}:00$/)
  })

  it('labels an hour the way a person says it', () => {
    expect(hourLabel('09:00')).toBe('9 AM')
    expect(hourLabel('22:00')).toBe('10 PM')
  })

  it('says "Not set" for a missing work hour', () => {
    expect(hourLabel(undefined)).toBe('Not set')
  })

  it('offers Off first for quiet hours, and calls an unset one Off', () => {
    // Quiet hours have to be switchable off; an empty value clears the field.
    expect(QUIET_HOURS[0]).toEqual({ value: '', label: 'Off' })
    expect(quietHourLabel(undefined)).toBe('Off')
    expect(quietHourLabel('22:00')).toBe('10 PM')
  })
})
