import type { Task } from '@/types/entities'
import type { ParsedTask } from './parseTaskInput'

/**
 * Whether a save moves or resizes the task's block — the cases Google Calendar must
 * hear about. Anything else (a title, notes) needs no calendar request.
 */
export const scheduleChanged = (before: Task, after: ParsedTask): boolean =>
  (after.scheduled_start_time ?? null) !== (before.scheduled_start_time ?? null) ||
  (after.estimated_minutes ?? null) !== (before.estimated_minutes ?? null)
