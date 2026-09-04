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
