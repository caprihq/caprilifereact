import type { Task } from '@/types/entities'
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
export const toTaskPatch = (draft: ParsedTask): Partial<Task> => ({
  title: draft.title.trim(),
  ...(draft.due_date ? { due_date: draft.due_date } : {}),
  ...(draft.estimated_minutes ? { estimated_minutes: draft.estimated_minutes } : {}),
  ...(draft.category ? { category: draft.category } : {}),
  ...(draft.priority ? { priority: draft.priority } : {}),
})
