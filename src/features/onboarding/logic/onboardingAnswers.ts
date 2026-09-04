import type { User } from '@/types/entities'

/**
 * First-run answers, and what they mean to the rest of the app.
 *
 * Ported from the web client's OnboardingSheet. The questions are asked in plain
 * language — "when do you usually work?" — and translated here into the fields the
 * planner and scorer actually read. That translation is the whole reason this is a
 * module rather than inline state: `energy_peak_hours` and `preferred_task_duration`
 * are consumed by code that must never see the phrase "9:00 AM - 5:00 PM".
 */

export const WORKING_HOURS_OPTIONS = [
  '7:00 AM - 3:00 PM',
  '8:00 AM - 4:00 PM',
  '9:00 AM - 5:00 PM',
  '10:00 AM - 6:00 PM',
  'Flexible',
] as const

export const FOCUS_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'No preference'] as const
export const DURATION_OPTIONS = ['15 min', '30 min', '45 min', '1 hour', '2 hours'] as const

export type WorkingHours = (typeof WORKING_HOURS_OPTIONS)[number]
export type FocusTime = (typeof FOCUS_OPTIONS)[number]
export type TaskDuration = (typeof DURATION_OPTIONS)[number]

export type OnboardingAnswers = {
  readonly name: string
  readonly workingHours: WorkingHours
  readonly focusTime: FocusTime
  readonly taskDuration: TaskDuration
  readonly timeZone: string
}

/** The hours a peak maps to. Matches the web client's `energyMap` exactly. */
const ENERGY_HOURS: Readonly<Record<FocusTime, readonly number[]>> = {
  Morning: [8, 9, 10],
  Afternoon: [13, 14, 15],
  Evening: [18, 19, 20],
  'No preference': [],
}

/** Three buckets, because the scorer reasons about task *shape*, not minutes. */
const DURATION_BUCKET: Readonly<Record<TaskDuration, 'quick' | 'mixed' | 'long'>> = {
  '15 min': 'quick',
  '30 min': 'quick',
  '45 min': 'mixed',
  '1 hour': 'mixed',
  '2 hours': 'long',
}

/** "9:00 AM" → "09:00". Returns null for anything that is not a clock time. */
export const toHHmm = (label: string): string | null => {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(label.trim())
  if (!match) return null

  const [, rawHour = '0', minute = '00', meridiem = 'AM'] = match
  const hour = Number(rawHour) % 12
  const adjusted = meridiem.toUpperCase() === 'PM' ? hour + 12 : hour

  return `${String(adjusted).padStart(2, '0')}:${minute}`
}

/**
 * The profile patch a completed onboarding writes.
 *
 * "Flexible" working hours deliberately write **nothing**: the planner falls back to
 * its own window, and storing a made-up 9–5 for someone who said their hours are
 * flexible would be inventing an answer they declined to give.
 */
export const toProfilePatch = (answers: OnboardingAnswers): Partial<User> => {
  const range = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)$/i.exec(
    answers.workingHours,
  )
  const start = range?.[1] ? toHHmm(range[1]) : null
  const end = range?.[2] ? toHHmm(range[2]) : null

  return {
    display_name: answers.name.trim(),
    timezone: answers.timeZone,
    ...(start && end ? { work_hours_start: start, work_hours_end: end } : {}),
    preferred_task_duration: DURATION_BUCKET[answers.taskDuration],
    energy_peak_hours: ENERGY_HOURS[answers.focusTime],
  }
}

/**
 * Whether to ask at all.
 *
 * The web client's test: a user with no name and no working hours has never been
 * through this. Someone who set either one — on the web, or in Profile here — is not
 * shown a wizard asking for what they already gave.
 */
export const needsOnboarding = (user: User | undefined, alreadyDone: boolean): boolean => {
  if (alreadyDone || !user) return false

  return !user.display_name && !user.work_hours_start
}
