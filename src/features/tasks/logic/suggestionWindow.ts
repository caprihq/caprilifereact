import { DEFAULT_DURATION_MINUTES } from './timeSlots'
import type { ScheduleWindow } from './timeSlots'
import type { Task } from '@/types/entities'

/**
 * The window an accepted suggestion writes.
 *
 * **The due date is left alone.** The web client's `handleAccept` writes the suggested
 * instant to `due_date` as well as to the start, which destroys the deadline: a task
 * due Friday, scheduled for Tuesday, became due Tuesday, and the real date was gone
 * for good. When you plan to do something is not when it is due.
 *
 * A task with no due date at all still gets one, because "scheduled for Tuesday"
 * with no deadline reads as open-ended everywhere else in the app, and the planner
 * has just made a judgement worth keeping.
 *
 * **The end comes from the planner.** The backend sends `suggested_end`, computed
 * from the same length it planned around — which may be one CAPRI inferred, as when
 * "Do taxes" has no estimate and gets two hours. Recomputing it here from the task's
 * own estimate would book half an hour where the plan reserved two.
 *
 * **An inferred length is kept.** When the planner had to guess the duration, the
 * guess is saved as the task's estimate, so the next plan, the widget and the
 * planner rows all agree on how long it takes. A length the user set is never
 * overwritten: the backend only sends `estimated_minutes` when it inferred one.
 *
 * Kept beside the manual-scheduling maths so accepting a suggestion and dropping a
 * task into a block cannot drift into writing different shapes.
 */

/** The parts of a backend suggestion this needs. */
export type SuggestedTime = {
  readonly suggested_time: string
  readonly suggested_end?: string | undefined
  readonly estimated_minutes?: number | undefined
}

export type SuggestionWindow = ScheduleWindow & { readonly estimated_minutes?: number }

const MINUTE_MS = 60_000

/** The planner's end, when it is a real instant after the start. */
const plannedEnd = (suggestion: SuggestedTime, startMs: number): number | null => {
  if (!suggestion.suggested_end) return null
  const endMs = new Date(suggestion.suggested_end).getTime()
  return Number.isNaN(endMs) || endMs <= startMs ? null : endMs
}

const inferredMinutes = (suggestion: SuggestedTime, task: Task | undefined): number | null => {
  const minutes = suggestion.estimated_minutes
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null
  return task?.estimated_minutes ? null : Math.round(minutes)
}

export const windowForSuggestion = (
  suggestion: SuggestedTime,
  task: Task | undefined,
): SuggestionWindow | null => {
  const start = new Date(suggestion.suggested_time)
  if (Number.isNaN(start.getTime())) return null

  const inferred = inferredMinutes(suggestion, task)
  const minutes = task?.estimated_minutes ?? inferred ?? DEFAULT_DURATION_MINUTES
  const endMs = plannedEnd(suggestion, start.getTime()) ?? start.getTime() + minutes * MINUTE_MS

  return {
    ...(task?.due_date ? {} : { due_date: start.toISOString() }),
    scheduled_start_time: start.toISOString(),
    scheduled_end_time: new Date(endMs).toISOString(),
    ...(inferred === null ? {} : { estimated_minutes: inferred }),
  }
}
