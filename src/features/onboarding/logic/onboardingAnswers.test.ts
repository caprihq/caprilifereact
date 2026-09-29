import {
  needsOnboarding,
  toHHmm,
  toProfilePatch,
} from './onboardingAnswers'
import type { OnboardingAnswers } from './onboardingAnswers'
import type { User } from '@/types/entities'

const answers = (overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers => ({
  name: 'Sam',
  workingHours: '9:00 AM - 5:00 PM',
  focusTime: 'Morning',
  taskDuration: '30 min',
  timeZone: 'Europe/London',
  ...overrides,
})

describe('toHHmm', () => {
  it('converts the clock labels people read to the 24h the API stores', () => {
    expect(toHHmm('9:00 AM')).toBe('09:00')
    expect(toHHmm('5:00 PM')).toBe('17:00')
  })

  it('handles both ends of the day, where 12 breaks naive maths', () => {
    // 12 AM is hour 0 and 12 PM is hour 12 — the one case a `+12` rule gets wrong.
    expect(toHHmm('12:00 AM')).toBe('00:00')
    expect(toHHmm('12:30 PM')).toBe('12:30')
  })

  it('returns null rather than a wrong time for anything else', () => {
    expect(toHHmm('Flexible')).toBeNull()
    expect(toHHmm('')).toBeNull()
  })
})

describe('toProfilePatch', () => {
  it('translates plain answers into the fields the planner reads', () => {
    expect(toProfilePatch(answers())).toEqual({
      display_name: 'Sam',
      timezone: 'Europe/London',
      work_hours_start: '09:00',
      work_hours_end: '17:00',
      preferred_task_duration: 'quick',
      energy_peak_hours: [8, 9, 10],
    })
  })

  it('writes no hours at all when the answer was "Flexible"', () => {
    // Storing a made-up 9–5 for someone who declined to give hours is inventing an
    // answer; the planner has its own fallback window.
    const patch = toProfilePatch(answers({ workingHours: 'Flexible' }))

    expect(patch.work_hours_start).toBeUndefined()
    expect(patch.work_hours_end).toBeUndefined()
    expect(patch.display_name).toBe('Sam')
  })

  it('buckets duration by shape, since the scorer does not reason in minutes', () => {
    expect(toProfilePatch(answers({ taskDuration: '15 min' })).preferred_task_duration).toBe('quick')
    expect(toProfilePatch(answers({ taskDuration: '1 hour' })).preferred_task_duration).toBe('mixed')
    expect(toProfilePatch(answers({ taskDuration: '2 hours' })).preferred_task_duration).toBe('long')
  })

  it('leaves peak hours empty when there is no preference', () => {
    expect(toProfilePatch(answers({ focusTime: 'No preference' })).energy_peak_hours).toEqual([])
  })
})

describe('needsOnboarding', () => {
  const user = (overrides: Partial<User> = {}): User => ({ email: 'a@b.c', ...overrides }) as User

  it('asks a user who has given neither a name nor hours', () => {
    expect(needsOnboarding(user(), false)).toBe(true)
  })

  it('does not ask someone who already answered elsewhere', () => {
    // Either field is evidence of a previous run — including one on the web client,
    // which writes the same profile.
    expect(needsOnboarding(user({ display_name: 'Sam' }), false)).toBe(false)
    expect(needsOnboarding(user({ work_hours_start: '09:00' }), false)).toBe(false)
  })

  it('does not ask twice on this device, and not before the user loads', () => {
    expect(needsOnboarding(user(), true)).toBe(false)
    expect(needsOnboarding(undefined, false)).toBe(false)
  })
})

describe('a name is never required — App Review guideline 4', () => {
  it('saves a profile with no name at all', () => {
    // Apple returns a name only on the first authorisation, and only if the person
    // agrees to share it. Someone who declines must still be able to finish setup.
    const saved = toProfilePatch({
      name: '',
      workingHours: '9:00 AM - 5:00 PM',
      focusTime: 'Morning',
      taskDuration: '30 min',
      timeZone: 'UTC',
    })

    expect(saved.display_name).toBe('')
    expect(saved.energy_peak_hours).toEqual([8, 9, 10])
  })
})
