import { firstClash } from './overlaps'
import type { Span } from './overlaps'

/**
 * Changes a person makes to CAPRI's plan before accepting it, and the checks on them.
 *
 * Pure. The review screen holds the list; these say what each change means.
 */

/** The parts of a suggestion these rules need. Structural, so `Suggestion` fits. */
export type EditableSuggestion = {
  readonly task_id: string
  readonly suggested_time: string
  readonly suggested_end?: string
  readonly reason?: string
  readonly task?: { readonly title: string }
}

/** Something already in the week, from the backend's `occupied` list. */
export type Occupied = { readonly title: string; readonly start: string; readonly end: string }

/** A planned task that clashes, from the backend's `conflicts` list. */
export type Conflict = {
  readonly task_id: string
  readonly task_title: string
  readonly start: string
  readonly end: string
  readonly with_title: string
  readonly with_start: string
  readonly with_end: string
}

const MINUTE_MS = 60_000
const DEFAULT_MINUTES = 30

const ms = (iso: string | undefined): number => (iso ? new Date(iso).getTime() : NaN)

/**
 * The suggestion at a new start, the same length as before.
 *
 * CAPRI's reason was written for the time it chose; at a time the person picked it
 * no longer explains anything, so it says so plainly instead.
 */
export const retimed = <S extends EditableSuggestion>(suggestion: S, start: Date): S => {
  const oldStart = ms(suggestion.suggested_time)
  const oldEnd = ms(suggestion.suggested_end)
  const length = Number.isNaN(oldEnd) || Number.isNaN(oldStart) ? DEFAULT_MINUTES * MINUTE_MS : oldEnd - oldStart
  return {
    ...suggestion,
    suggested_time: start.toISOString(),
    suggested_end: new Date(start.getTime() + length).toISOString(),
    reason: 'At the time you chose.',
  }
}

/** Puts a fresh suggestion for one task at the top, replacing any older one for it. */
export const withSuggestion = <S extends EditableSuggestion>(list: readonly S[], next: S): readonly S[] => [
  next,
  ...list.filter((entry) => entry.task_id !== next.task_id),
]

const spanOf = (key: string, title: string, range: { readonly start: number; readonly end: number }): Span[] =>
  Number.isNaN(range.start) || Number.isNaN(range.end) || range.end <= range.start
    ? []
    : [{ key, title, start: range.start, end: range.end }]

const rangeOf = (start: string | undefined, end: string | undefined) => ({ start: ms(start), end: ms(end) })

/**
 * What a suggestion would clash with: the week's fixed and planned items, and the
 * other suggestions still on screen (accepting both would clash too).
 */
export const clashFor = (
  suggestion: EditableSuggestion,
  context: { readonly others: readonly EditableSuggestion[]; readonly occupied: readonly Occupied[] },
): Span | undefined => {
  const [own] = spanOf(`s-${suggestion.task_id}`, suggestion.task?.title ?? 'Task', rangeOf(suggestion.suggested_time, suggestion.suggested_end))
  if (!own) return undefined
  const others = [
    ...context.occupied.flatMap((o, i) => spanOf(`o-${String(i)}`, o.title, rangeOf(o.start, o.end))),
    ...context.others.flatMap((s) => spanOf(`s-${s.task_id}`, s.task?.title ?? 'Task', rangeOf(s.suggested_time, s.suggested_end))),
  ]
  return firstClash(own, others)
}

/** Identifies a week clash at these times, for "keep both". */
export const conflictKey = (conflict: Conflict): string =>
  `week:${conflict.task_id}@${conflict.start}|${conflict.with_title}@${conflict.with_start}`
