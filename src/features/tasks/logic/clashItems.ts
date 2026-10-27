import { overlapLabel } from './overlaps'
import type { Overlap } from './overlaps'
import { conflictKey } from './suggestionEdits'
import type { Conflict } from './suggestionEdits'

/**
 * A clash as the screen lists it: whose, with what, and the key "keep both" stores.
 *
 * Today's overlaps (computed in the app) and the week's conflicts (from the backend)
 * become the same thing here, so one list shows both with the same three fixes.
 */
export type ClashItem = {
  readonly key: string
  readonly taskId: string
  readonly title: string
  readonly detail: string
}

export const fromOverlap = (overlap: Overlap, timeZone: string): ClashItem => ({
  key: overlap.key,
  taskId: overlap.task.id,
  title: overlap.task.title,
  detail: overlapLabel(overlap, timeZone),
})

const at = (iso: string, timeZone: string, withDay: boolean): string =>
  new Date(iso).toLocaleString('en-US', {
    ...(withDay ? { weekday: 'short' } : {}),
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })

/** "Thu 2:00 PM overlaps Team meeting (2:00 PM – 3:00 PM)" */
export const fromConflict = (conflict: Conflict, timeZone: string): ClashItem => ({
  key: conflictKey(conflict),
  taskId: conflict.task_id,
  title: conflict.task_title,
  detail: `${at(conflict.start, timeZone, true)} overlaps ${conflict.with_title} (${at(conflict.with_start, timeZone, false)} – ${at(conflict.with_end, timeZone, false)})`,
})

/** A Date on `day`'s date at `base`'s clock time (device-local, like the pickers). */
export const withDayOf = (base: Date, day: Date): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes())

/** A Date at `time`'s clock time on `base`'s date. */
export const withTimeOf = (base: Date, time: Date): Date =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate(), time.getHours(), time.getMinutes())
