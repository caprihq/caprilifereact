import type { Task } from '@/types/entities'

/**
 * Where a planned task clashes with something else in the day.
 *
 * A planner that lets two things sit in the same hour without saying so is not
 * planning. CAPRI never moves a time the user chose, or a meeting, on its own — so
 * the next best thing is to say clearly what clashes and offer the fixes.
 *
 * Pure: everything is passed in, including what the user has already said is fine.
 */

const MINUTE_MS = 60_000
/** A planned task with no length still takes time; the same default the planner uses. */
const DEFAULT_MINUTES = 30

/** Anything that occupies time: a meeting, a commitment, or a planned task. */
export type Span = {
  readonly key: string
  readonly title: string
  readonly start: number
  readonly end: number
}

export type Overlap = {
  readonly task: Task
  readonly with: Span
  /** Identifies this clash at these times, so "keep both" stops warning about it. */
  readonly key: string
}

/** Only work still to do holds time: not done, cancelled, or saved for later. */
const OPEN: ReadonlySet<string> = new Set(['pending', 'in_progress'])

/** The time a planned task occupies, or null when it has no usable time. */
export const taskSpan = (task: Task): Span | null => {
  if (!task.scheduled_start_time || !OPEN.has(task.status ?? 'pending')) return null
  const start = new Date(task.scheduled_start_time).getTime()
  if (Number.isNaN(start)) return null

  const ownEnd = task.scheduled_end_time ? new Date(task.scheduled_end_time).getTime() : NaN
  const end = Number.isNaN(ownEnd)
    ? start + (task.estimated_minutes ?? DEFAULT_MINUTES) * MINUTE_MS
    : ownEnd
  return end > start ? { key: `task-${task.id}`, title: task.title, start, end } : null
}

const clash = (a: Span, b: Span): boolean => a.start < b.end && b.start < a.end

export const overlapKey = (task: Span, other: Span): string =>
  `${task.key}@${String(task.start)}|${other.key}@${String(other.start)}`

/**
 * One warning per task: the first thing it clashes with.
 *
 * Fixed items (meetings, commitments, appointments) are checked first, because they
 * are the thing that cannot move. Two planned tasks that clash are reported once, on
 * the one that starts later — warning about both would double-count one problem.
 */
export const findOverlaps = (input: {
  readonly tasks: readonly Task[]
  readonly fixed: readonly Span[]
  readonly dismissed: ReadonlySet<string>
}): readonly Overlap[] => {
  const planned = input.tasks
    .flatMap((task) => {
      const span = taskSpan(task)
      return span ? [{ task, span }] : []
    })
    .sort((a, b) => a.span.start - b.span.start)
  const fixed = [...input.fixed].sort((a, b) => a.start - b.start)

  return planned.flatMap(({ task, span }, index) => {
    const earlierTasks = planned.slice(0, index).map((entry) => entry.span)
    const other = [...fixed, ...earlierTasks].find(
      (candidate) => candidate.key !== span.key && clash(span, candidate),
    )
    if (!other) return []
    const key = overlapKey(span, other)
    return input.dismissed.has(key) ? [] : [{ task, with: other, key }]
  })
}

const clock = (ms: number, timeZone: string): string =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })

/** "Overlaps Team meeting · 2:00 PM – 3:00 PM" */
export const spanLabel = (span: Span, timeZone: string): string =>
  `Overlaps ${span.title} · ${clock(span.start, timeZone)} – ${clock(span.end, timeZone)}`

export const overlapLabel = (overlap: Overlap, timeZone: string): string => spanLabel(overlap.with, timeZone)

/** The day's fixed items as spans: timed, busy, and with a usable end. */
export const fixedSpans = (
  items: ReadonlyArray<{
    readonly id: string
    readonly title: string
    readonly sortMs: number
    readonly endMs?: number
    readonly allDay?: boolean
    readonly free?: boolean
  }>,
): readonly Span[] =>
  items.flatMap((item) =>
    item.allDay || item.free || item.endMs === undefined
      ? []
      : [{ key: item.id, title: item.title, start: item.sortMs, end: item.endMs }],
  )

/** The first span `span` clashes with, if any. */
export const firstClash = (span: Span, others: readonly Span[]): Span | undefined =>
  others.find((other) => other.key !== span.key && clash(span, other))
