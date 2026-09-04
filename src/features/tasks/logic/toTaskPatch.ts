import type { TaskUpdate } from '@/features/tasks/services/useTaskCrud'
import type { ParsedTask } from './parseTaskInput'

/**
 * Turn an edited draft into an API patch.
 *
 * Undefined fields are omitted rather than sent: Base44 stores what it is
 * given, so posting `due_date: undefined` is at best meaningless and at worst
 * clears a value the user never touched. This also satisfies
 * exactOptionalPropertyTypes, which correctly distinguishes "absent" from
 * "present and undefined".
 */
export const toTaskPatch = (draft: ParsedTask): TaskUpdate => ({
  title: draft.title.trim(),
  ...(draft.description === undefined ? {} : { description: draft.description.trim() }),
  ...(draft.due_date ? { due_date: draft.due_date } : {}),
  ...(draft.estimated_minutes ? { estimated_minutes: draft.estimated_minutes } : {}),
  ...(draft.category ? { category: draft.category } : {}),
  ...(draft.priority ? { priority: draft.priority } : {}),
  ...(draft.is_scheduled_event ? { is_scheduled_event: true } : {}),
  ...(draft.recurrence ? { recurrence: draft.recurrence } : {}),
  // Null clears a previous end date; undefined would leave the old one in place.
  ...(draft.recurrence
    ? { recurrence_end_date: draft.recurrence_end_date ?? null }
    : {}),
})
