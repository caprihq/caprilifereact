import { FREE_LIMITS } from '@/config'
import type { Task } from '@/types/entities'

/**
 * The Up Next recommendation cache and its free-tier refresh budget.
 *
 * Two separate limits, both from the web client:
 *
 * - **A 30-minute TTL.** The recommendation is a judgement about "right now", and
 *   re-asking the model on every mount would spend on a question whose answer has
 *   not changed.
 * - **Three manual refreshes a day on the free plan.** Counted per calendar day, so
 *   the budget resets at local midnight rather than 24 hours after first use.
 *
 * Pure: storage is injected, and the clock is an argument. That is what makes the
 * expiry and the day boundary testable at a fixed instant (§2.3).
 */

/** Sourced from the shared plan config so the two cannot drift. */
export const FREE_REFRESH_LIMIT = FREE_LIMITS.upNextRefreshesPerDay
export const CACHE_TTL_MS = 30 * 60 * 1000

/**
 * How many recommendations one call returns: the Start Here hero plus the three
 * Up Next rows.
 *
 * The web client asks for three and then spends a *second* identical call to decide
 * what Start Here should be. One answer covers both sections here, which is why this
 * is four rather than three.
 */
export const RECOMMENDATION_COUNT = 4

export type Recommendation = {
  readonly task_id: string
  readonly reason: string
}

export type CacheEntry = {
  readonly recommendations: readonly Recommendation[]
  readonly cachedAtMs: number
  /** Which plan produced it: a free-tier answer must not be served to a paid user. */
  readonly tier: 'free' | 'paid'
  /**
   * Every task CAPRI could choose from when this answer was given.
   *
   * Kept so a task created afterwards can be noticed. Optional because an entry
   * written by an earlier build has none, and a missing list must not be read as
   * "nothing was available" — see `hasNewCandidates`.
   */
  readonly candidateIds?: readonly string[]
}

/**
 * Has a task appeared since this answer was given?
 *
 * A ranking is a judgement about a particular set of tasks. Add one and the answer
 * is stale — but the cache was only checked for age, so a task created a minute
 * after the last ranking was appended to the end of Up Next regardless of how
 * urgent it was, and stayed there until "Ask CAPRI again" was pressed by hand.
 *
 * Only *additions* count. A task that disappears is already handled: `hydrate`
 * drops it and `topUpEntries` closes the gap, and re-ranking on every completion
 * would spend a model call each time someone ticked something off.
 *
 * An entry with no recorded list is treated as current. It comes from a build that
 * did not write one, and re-asking for every user on first launch after an update
 * would be a needless burst of traffic; the next answer records its list and the
 * check starts working.
 */
export const hasNewCandidates = (
  entry: CacheEntry | null,
  candidates: readonly Task[],
): boolean => {
  if (!entry?.candidateIds) return false
  const known = new Set(entry.candidateIds)

  return candidates.some((task) => !known.has(task.id))
}

export const isFresh = (entry: CacheEntry | null, nowMs: number, tier: 'free' | 'paid'): boolean => {
  if (!entry) return false
  // A tier change means the user upgraded; the cheaper answer is no longer the one
  // they are paying for.
  if (entry.tier !== tier) return false

  return nowMs - entry.cachedAtMs < CACHE_TTL_MS
}

/** `upnext_refreshes_2026-08-29` — the key resets itself at local midnight. */
export const refreshCountKey = (nowMs: number): string =>
  `upnext_refreshes_${new Date(nowMs).toISOString().slice(0, 10)}`

export const canRefresh = (used: number, tier: 'free' | 'paid'): boolean =>
  tier === 'paid' || used < FREE_REFRESH_LIMIT

/**
 * Recommendations rebuilt from the local ranking, used when the model is
 * unavailable or the budget is spent.
 *
 * The card must always have something to show: an Up Next that empties itself
 * because a network call failed looks like the user has no work left.
 */
export const fallbackRecommendations = (
  ranked: readonly { readonly task: Task; readonly reason: string }[],
): readonly Recommendation[] =>
  ranked
    .slice(0, RECOMMENDATION_COUNT)
    .map((entry) => ({ task_id: entry.task.id, reason: entry.reason }))

/**
 * Fill the queue back up from the local ranking.
 *
 * `hydrate` drops any recommendation whose task has since been finished or deleted,
 * and a model asked for four can simply answer with fewer. Either way the list
 * arrives short, and the old rule — use the local ranking only when the model gave
 * *nothing* — left those places empty: a user with three open tasks saw one, and
 * "Nothing else queued" underneath it. The home-screen widget then published the
 * same empty list, because it shows exactly what Home shows.
 *
 * So the model's picks lead, in its order, and the local ranking fills whatever is
 * left. `seen` keeps a task that appears in both from being listed twice.
 */
export const topUpEntries = <T extends { readonly task: Task }>(
  primary: readonly T[],
  local: readonly T[],
  limit = RECOMMENDATION_COUNT,
): readonly T[] => {
  const seen = new Set(primary.map((entry) => entry.task.id))
  const filler = local.filter((entry) => !seen.has(entry.task.id))

  return [...primary, ...filler].slice(0, limit)
}

/** Hydrate cached ids against the live task list, dropping anything since finished. */
export const hydrate = (
  recommendations: readonly Recommendation[],
  tasks: readonly Task[],
): readonly { readonly task: Task; readonly reason: string }[] =>
  recommendations
    .map((entry) => {
      const task = tasks.find((candidate) => candidate.id === entry.task_id)
      return task ? { task, reason: entry.reason } : null
    })
    .filter((entry): entry is { task: Task; reason: string } => entry !== null)

/**
 * The stored answer, checked against the tasks that still exist.
 *
 * A recommendation is state: written when the model replies, then left alone. Nothing
 * re-examined it when the task list changed, so deleting the last task left "Start
 * Here" showing it while every other section updated — the effect that reloads the
 * answer returns early once there are no candidates, so it never ran.
 *
 * Applying this on the way out instead means a task leaving the list leaves the
 * screen in the same render, however it left: deleted, completed, or turned into a
 * scheduled event.
 */
export const visibleEntries = <T extends { readonly task: Task }>(
  entries: readonly T[],
  candidates: readonly Task[],
  local: readonly T[],
): readonly T[] => {
  const live = entries.filter((entry) =>
    candidates.some((candidate) => candidate.id === entry.task.id),
  )

  return live.length > 0 ? topUpEntries(live, local) : local
}
