import type { TaskUpdate } from '@/features/tasks/services/useTaskCrud'
import { DEFAULT_DURATION_MINUTES } from './timeSlots'
import type { ParsedTask } from './parseTaskInput'

/**
 * A start plus a duration, as an end instant.
 *
 * The same rule `windowForSuggestion` uses for an accepted suggestion, so an event
 * entered by hand and one placed by CAPRI occupy time the same way.
 */
const endOf = (startIso: string, minutes: number | undefined): string => {
  const start = new Date(startIso)
  const span = (minutes ?? DEFAULT_DURATION_MINUTES) * 60_000

  return new Date(start.getTime() + span).toISOString()
}

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
  /**
   * `typeof`, not `=== undefined`.
   *
   * Base44 returns `null` for a description that was never written — the entity type
   * says `string | undefined`, so nothing here failed to compile, and the value still
   * arrives null at runtime. Testing only for undefined let a null through to
   * `.trim()`, which threw on save for any task with no notes.
   */
  ...(typeof draft.description === 'string' ? { description: draft.description.trim() } : {}),
  ...(draft.due_date ? { due_date: draft.due_date } : {}),
  ...(draft.estimated_minutes ? { estimated_minutes: draft.estimated_minutes } : {}),
  ...(draft.category ? { category: draft.category } : {}),
  ...(draft.priority ? { priority: draft.priority } : {}),
  // Sent whenever the draft has an opinion, true or false. Testing for truth alone
  // meant "off" became an omitted field, which Base44 leaves as it was — so a task
  // marked as a scheduled event could never be turned back into ordinary work.
  ...(draft.is_scheduled_event === undefined
    ? {}
    : { is_scheduled_event: draft.is_scheduled_event }),
  ...(draft.scheduled_start_time
    ? {
        scheduled_start_time: draft.scheduled_start_time,
        // The end is derived, never asked for: one field to fill instead of two, and
        // the two cannot contradict each other.
        //
        // It has to be written, not merely implied. `autoScheduleTasks` builds its
        // list of occupied time from tasks that have **both** a start and an end, so
        // an event carrying only a start counted as free — and CAPRI would plan work
        // straight over the appointment the flag exists to protect.
        scheduled_end_time: endOf(draft.scheduled_start_time, draft.estimated_minutes),
      }
    : {}),
  ...(draft.recurrence ? { recurrence: draft.recurrence } : {}),
  // Null clears a previous end date; undefined would leave the old one in place.
  ...(draft.recurrence
    ? { recurrence_end_date: draft.recurrence_end_date ?? null }
    : {}),
})
