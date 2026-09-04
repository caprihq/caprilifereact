import { DEFAULT_DURATION_MINUTES } from './timeSlots'
import type { ScheduleWindow } from './timeSlots'
import type { Task } from '@/types/entities'

/**
 * The window an accepted suggestion writes.
 *
 * Mirrors the web client's `handleAccept`: the suggested instant becomes both the
 * due date and the start, and the end follows from the task's estimate. Kept beside
 * the manual-scheduling maths so accepting a suggestion and dropping a task into a
 * block cannot drift into writing different shapes.
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
    due_date: start.toISOString(),
    scheduled_start_time: start.toISOString(),
    scheduled_end_time: end.toISOString(),
  }
}
