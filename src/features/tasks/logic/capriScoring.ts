import type { Task } from '@/types/entities'

/**
 * CAPRI Scoring Engine — native port of web/src/lib/capriScoring.js.
 *
 *   Score = (Urgency × 3) + (Importance × 2) + Effort
 *
 *   Urgency     overdue 5 · today 4 · 1–2d 3 · 3–5d 2 · far/none 1
 *   Importance  high|critical 3 · medium 2 · low 1
 *   Effort      <30m 3 · 30–60m 2 · >60m 1 · unknown 2
 *
 *   Behavioural (hidden from the user)
 *     +0.5 interacted in the last 24h
 *     +0.3 category the user completes often
 *     −0.5 ignored 3+ times
 *
 *   Critical rule: if any task has urgency ≥ 3, a task with urgency ≤ 1
 *   cannot hold the #1 slot.
 *
 * TWO DELIBERATE CHANGES FROM THE WEB VERSION
 *
 * 1. Pure. The original read localStorage *inside the sort comparator*, so an
 *    N-task sort triggered O(N log N) storage reads and JSON.parse calls, and
 *    the file could not be tested without a DOM. Behavioural signals are now
 *    passed in; the caller reads storage once (guidelines §2.3).
 * 2. Non-mutating. The original called `.sort()` and `.splice()` on the caller's
 *    array (§2.4).
 */

export type BehaviouralSignals = {
  /** Task ids interacted with in the last 24h. */
  readonly recentlyTouched: ReadonlySet<string>
  /** Task ids skipped 3+ times. */
  readonly repeatedlyIgnored: ReadonlySet<string>
  /** Categories the user completes disproportionately often (>30% of completions). */
  readonly favouredCategories: ReadonlySet<string>
}

export const NO_SIGNALS: BehaviouralSignals = {
  recentlyTouched: new Set(),
  repeatedlyIgnored: new Set(),
  favouredCategories: new Set(),
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Statuses excluded from ranking. */
const EXCLUDED_STATUSES = new Set(['completed', 'archived', 'cancelled', 'canceled', 'unschedulable'])

export const getUrgency = (task: Task, nowMs: number): number => {
  if (!task.due_date) return 1
  const daysUntil = (new Date(task.due_date).getTime() - nowMs) / DAY_MS
  if (Number.isNaN(daysUntil)) return 1
  if (daysUntil < 0) return 5
  if (daysUntil < 1) return 4
  if (daysUntil <= 2) return 3
  if (daysUntil <= 5) return 2
  return 1
}

export const getImportance = (task: Task): number => {
  if (task.priority === 'critical' || task.priority === 'high') return 3
  if (task.priority === 'medium') return 2
  return 1
}

export const getEffort = (task: Task): number => {
  if (!task.estimated_minutes) return 2
  if (task.estimated_minutes < 30) return 3
  if (task.estimated_minutes <= 60) return 2
  return 1
}

export const getBehaviouralBoost = (task: Task, signals: BehaviouralSignals): number => {
  let boost = 0
  if (signals.recentlyTouched.has(task.id)) boost += 0.5
  if (task.category && signals.favouredCategories.has(task.category)) boost += 0.3
  if (signals.repeatedlyIgnored.has(task.id)) boost -= 0.5
  return boost
}

export const scoreTask = (
  task: Task,
  nowMs: number,
  signals: BehaviouralSignals = NO_SIGNALS,
): number =>
  getUrgency(task, nowMs) * 3 +
  getImportance(task) * 2 +
  getEffort(task) +
  getBehaviouralBoost(task, signals)

export type RankedTask = {
  readonly task_id: string
  readonly task: Task
  readonly rank: number
}

/**
 * Rank active tasks. Returns a new array; the input is never touched.
 *
 * The critical rule is applied after sorting: if the top task has urgency ≤ 1
 * while something urgent exists, it is moved down to just after the first
 * urgent task rather than being dropped.
 */
export const rankTasks = (
  tasks: readonly Task[],
  options: {
    readonly nowMs: number
    readonly limit?: number
    readonly signals?: BehaviouralSignals
  },
): readonly RankedTask[] => {
  const { nowMs, limit = 3, signals = NO_SIGNALS } = options

  const scored = tasks
    .filter((task) => !EXCLUDED_STATUSES.has(task.status ?? 'pending'))
    .map((task) => ({
      task,
      score: scoreTask(task, nowMs, signals),
      urgency: getUrgency(task, nowMs),
    }))
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return []

  const ordered = [...scored]
  const top = ordered[0]
  const hasUrgent = ordered.some((entry) => entry.urgency >= 3)

  if (hasUrgent && top && top.urgency <= 1) {
    const firstUrgent = ordered.findIndex((entry) => entry.urgency >= 3)
    if (firstUrgent > 0) {
      ordered.splice(0, 1)
      ordered.splice(firstUrgent, 0, top)
    }
  }

  return ordered.slice(0, limit).map((entry, index) => ({
    task_id: entry.task.id,
    task: entry.task,
    rank: index + 1,
  }))
}
