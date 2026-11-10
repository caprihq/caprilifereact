import type { Task } from '@/types/entities'
import { toLocalDateString } from '@/utils/localDate'
import { hasNewCandidates, isFresh } from './recommendationCache'
import type { CacheEntry } from './recommendationCache'

/**
 * When CAPRI's Up Next answer still stands, so Start Here does not reword itself.
 *
 * WHY THIS EXISTS
 *   Home re-checked its answer on every clock tick, and once the answer was half an
 *   hour old each check asked the model again. The model words its reasons afresh
 *   every time, so on an open screen Start Here rewrote itself with nothing having
 *   changed — it looked like a glitch — and the widget, published a moment earlier,
 *   disagreed with what Home now showed.
 *
 * THE RULE
 *   A model answer is kept, however old, for as long as it is the same day and every
 *   task it could choose from is one it already saw, unchanged. Ticking a task off
 *   keeps it (the next one moves up); adding a task, or changing one's priority, due
 *   date, length or category, falls back to the old rule: reuse while under half an
 *   hour old and nothing was added, else ask again.
 *
 * Pure: the clock and zone are arguments (§2.3).
 */

export type RankingSignature = {
  /** The user's local day. A new day is a new question. */
  readonly day: string
  /** One line per task: the fields the ranking reads, sorted. */
  readonly lines: readonly string[]
  /** Both, as one string: what Home re-checks on, instead of every clock tick. */
  readonly key: string
}

/** Due dates compared as instants: the app and the server write the same one differently. */
const lineFor = (task: Task): string => {
  const due = task.due_date ? Date.parse(task.due_date) : NaN
  return [
    task.id,
    task.priority ?? '',
    Number.isNaN(due) ? '' : String(due),
    task.estimated_minutes ?? '',
    task.category ?? '',
  ].join('|')
}

export const rankingSignature = (
  tasks: readonly Task[],
  nowMs: number,
  timeZone: string,
): RankingSignature => {
  const day = toLocalDateString(new Date(nowMs), timeZone)
  const lines = tasks.map(lineFor).sort()
  return { day, lines, key: [day, ...lines].join('\n') }
}

/** Whether the cached answer still stands, without asking the model again. */
export const canReuse = (
  entry: CacheEntry | null,
  current: { readonly signature: RankingSignature; readonly candidates: readonly Task[] },
  clock: { readonly nowMs: number; readonly tier: 'free' | 'paid' },
): boolean => {
  if (!entry || entry.tier !== clock.tier) return false

  const seen = new Set(entry.rankingLines ?? [])
  const sameQuestion =
    entry.rankingLines !== undefined &&
    entry.rankingDay === current.signature.day &&
    current.signature.lines.every((line) => seen.has(line))
  if (sameQuestion) return true

  return !hasNewCandidates(entry, current.candidates) && isFresh(entry, clock.nowMs, clock.tier)
}
