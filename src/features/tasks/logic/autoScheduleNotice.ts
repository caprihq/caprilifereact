import type { FeedbackTone } from '@/store'

/**
 * Why auto-schedule came back with nothing → what to tell the user.
 *
 * The hook used to show `response.data.debug` verbatim. That field is the backend's
 * log line: it is written for whoever is reading the function's output, it is free to
 * change wording at any deploy, and nothing stops a future branch putting a stack
 * trace in it. A user was reading our server logs.
 *
 * The backend now sends a `reason` code and the hours it searched as numbers, so the
 * app writes the sentence — and can say something useful, because the two empty
 * outcomes are not the same. "Everything is done" deserves congratulations; "your
 * week is full" deserves a way forward.
 *
 * Pure, so the wording is testable without the network (§3.5).
 */

export type EmptyPlan = {
  readonly reason?: string | undefined
  readonly workHours?: { readonly start?: number; readonly end?: number } | undefined
}

export type PlanNotice = {
  readonly message: string
  readonly tone: FeedbackTone
}

/** `9` → `09:00`, so the message reads like a clock rather than an integer. */
const clock = (hour: number): string => `${String(hour).padStart(2, '0')}:00`

const searchedWindow = (hours: EmptyPlan['workHours']): string =>
  typeof hours?.start === 'number' && typeof hours.end === 'number'
    ? ` between ${clock(hours.start)} and ${clock(hours.end)}`
    : ''

export const emptyPlanNotice = (plan: EmptyPlan): PlanNotice => {
  if (plan.reason === 'no_pending_tasks') {
    return { message: 'Nothing left to schedule — your list is clear.', tone: 'success' }
  }

  if (plan.reason === 'no_free_slots') {
    return {
      message:
        `No free time${searchedWindow(plan.workHours)} in the next seven days. ` +
        'Widen your work hours in Profile, or free up some of the week.',
      tone: 'warning',
    }
  }

  // An older backend, or one that answered in a way this build does not know.
  return { message: 'CAPRI found no time to schedule into this week.', tone: 'info' }
}
