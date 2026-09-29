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
 * Kept beside the manual-scheduling maths so accepting a suggestion and dropping a
 * task into a block cannot drift into writing different shapes.
 */
export const windowForSuggestion = (
  suggestedTime: string,
  task: Task | undefined,
): ScheduleWindow | null => {
  const start = new Date(suggestedTime)
  if (Number.isNaN(start.getTime())) return null

  const minutes = task?.estimated_minutes ?? DEFAULT_DURATION_MINUTES
  const end = new Date(start.getTime() + minutes * 60_000)

  return {
    ...(task?.due_date ? {} : { due_date: start.toISOString() }),
    scheduled_start_time: start.toISOString(),
    scheduled_end_time: end.toISOString(),
  }
}
