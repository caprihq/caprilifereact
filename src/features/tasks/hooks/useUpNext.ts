import { useCallback, useEffect, useMemo, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import { trackRanking } from '@/services'
import type { Task } from '@/types/entities'
import { getTaskReason } from '../logic/taskReason'
import {
  CACHE_TTL_MS,
  FREE_REFRESH_LIMIT,
  RECOMMENDATION_COUNT,
  canRefresh,
  fallbackRecommendations,
  hydrate,
  topUpEntries,
  visibleEntries,
} from '../logic/recommendationCache'
import { canReuse, rankingSignature } from '../logic/rankingSignature'
import type { RankingSignature } from '../logic/rankingSignature'
import { recommendTasks } from '../services/aiRecommendations'
import { countRefresh, readCache, readCount, remember } from '../services/upNextStore'
import type { UpNextEntry } from '../services/upNextStore'
import { useUserContext } from './useUserContext'

/**
 * Start Here and Up Next: CAPRI's answer to "what now", with the model consulted
 * sparingly.
 *
 * One call answers both sections. The first recommendation is the hero — the task
 * CAPRI says to start, in its own words — and the rest are the queue behind it.
 * Start Here used to be chosen entirely locally and explained with a canned line from
 * `taskReason`, so the app's most prominent recommendation was the one place the
 * model was never asked.
 *
 * Three guards, all from the web client, all about not spending on a question whose
 * answer has not changed:
 *
 *  - a **cache**, kept for as long as the day and the tasks are the same (see
 *    `rankingSignature`), and for 30 minutes after a change, so remounting the screen
 *    is free and Start Here does not reword itself while someone is reading it;
 *  - **three manual refreshes a day** on the free plan, reset at local midnight;
 *  - a **local fallback** whenever the model is unavailable or the budget is spent,
 *    so the card is never empty. An Up Next that empties itself on a failed request
 *    reads as "no work left", which is the opposite of the truth.
 *
 * The local ranking is not a downgrade — it is the same `capriScoring` engine the
 * hero uses. The model adds a written reason and a judgement call between close
 * candidates.
 *
 * What the model does not get from the local engine is *capacity*: the user's
 * preferences and how full today already is. `useUserContext` supplies that, which
 * is what lets a heavy day push short tasks up the list.
 */

/** The hero plus the queue behind it, from whichever source answered. */
const split = (entries: readonly UpNextEntry[]) => ({
  hero: entries[0] ?? null,
  entries: entries.slice(1, RECOMMENDATION_COUNT),
})

export type UpNextRequest = {
  /** Everything CAPRI may choose from. */
  readonly candidates: readonly Task[]
  /** The local ranking's best few — the first paint, and the fallback. */
  readonly shortlist: readonly Task[]
  readonly userEmail: string | null
  readonly nowMs: number
  readonly timeZone: string
}

/**
 * The cached answer, if it still stands — the first paint on a launch, so Home opens
 * on what it showed last time (and what the widget shows) instead of the local
 * ranking for a moment first.
 */
const cachedEntries = (
  current: { readonly signature: RankingSignature; readonly candidates: readonly Task[] },
  clock: { readonly nowMs: number; readonly tier: 'free' | 'paid' },
  local: readonly UpNextEntry[],
): readonly UpNextEntry[] => {
  const cached = readCache()
  if (!canReuse(cached, current, clock) || !cached) return []
  const hydrated = hydrate(cached.recommendations, current.candidates)
  return hydrated.length > 0 ? topUpEntries(hydrated, local) : []
}

/**
 * The local ranking, always available and always the fallback.
 *
 * Its own hook so `useUpNext` stays inside the 80-line limit (§3.2).
 */
const useLocalRanking = (shortlist: readonly Task[], nowMs: number): readonly UpNextEntry[] =>
  useMemo(
    () =>
      shortlist
        .slice(0, RECOMMENDATION_COUNT)
        .map((task) => ({ task, reason: getTaskReason(task, nowMs) })),
    [shortlist, nowMs],
  )

/** The question Home is asking — see `rankingSignature`. Compared by `key`, not identity. */
const useRankingSignature = (candidates: readonly Task[], nowMs: number, timeZone: string) =>
  useMemo(() => rankingSignature(candidates, nowMs, timeZone), [candidates, nowMs, timeZone])

/**
 * After a failed call the local ranking stands in, and the model is tried again each
 * half hour rather than only when the tasks change: `retryBucket` moves on then.
 */
const useRetryClock = (nowMs: number) => {
  const [retrying, setRetrying] = useState(false)
  return { retryBucket: retrying ? Math.floor(nowMs / CACHE_TTL_MS) : 0, setRetrying }
}

export const useUpNext = (request: UpNextRequest) => {
  const { candidates, shortlist, userEmail, nowMs, timeZone } = request
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const tier = hasAccess('analytics') ? 'paid' : 'free'
  const contextSummary = useUserContext({ userEmail, nowMs, timeZone })

  const local = useLocalRanking(shortlist, nowMs)
  const signature = useRankingSignature(candidates, nowMs, timeZone)
  const [entries, setEntries] = useState<readonly UpNextEntry[]>(() =>
    cachedEntries({ signature, candidates }, { nowMs, tier }, local),
  )
  const [loading, setLoading] = useState(false)
  const { retryBucket, setRetrying } = useRetryClock(nowMs)

  const ask = useCallback(
    async (force: boolean) => {
      if (force && !canRefresh(readCount(nowMs), tier)) {
        show({
          message: `Free plan includes ${String(FREE_REFRESH_LIMIT)} refreshes a day. Upgrade for unlimited.`,
          tone: 'warning',
        })
        return
      }

      setLoading(true)
      const recommended = await recommendTasks({
        tasks: candidates,
        userEmail,
        contextSummary,
      })
      setLoading(false)

      if (force) countRefresh(nowMs)

      // Hydrated against the full set: the model may well pick something the local
      // pass left out of the shortlist, which is the point of asking it.
      const hydrated = hydrate(recommended ?? fallbackRecommendations(local), candidates)
      // A success only if the model named tasks that still exist to show.
      const fromModel = recommended !== null && hydrated.length > 0
      trackRanking({ fromModel, manual: force })
      setRetrying(!fromModel)
      // Topped up rather than replaced: a model that answers with fewer than it was
      // asked for, or names tasks since deleted, used to empty the queue outright.
      const final = topUpEntries(hydrated, local)

      setEntries(final)
      remember({
        final,
        cachedAtMs: nowMs,
        tier,
        candidateIds: candidates.map((task) => task.id),
        ranking: fromModel ? { day: signature.day, lines: signature.lines } : null,
      })
    },
    [candidates, contextSummary, local, nowMs, setRetrying, show, signature, tier, userEmail],
  )

  const load = useCallback(
    (force: boolean) => {
      // Reused while it still stands; a task added since makes it stale — see `canReuse`.
      const reused = force
        ? []
        : cachedEntries({ signature, candidates }, { nowMs, tier }, local)
      if (reused.length > 0) {
        setEntries(reused)
        return
      }
      void ask(force)
    },
    [ask, candidates, local, nowMs, signature, tier],
  )

  useEffect(() => {
    if (candidates.length === 0) return

    // Deferred: setting state synchronously inside an effect cascades renders, and
    // the first paint should show the local ranking rather than wait on a model.
    const timer = setTimeout(() => {
      load(false)
    }, 0)
    return () => {
      clearTimeout(timer)
    }
    // Keyed on what the ranking depends on, not on `load` or the task array: both
    // change identity whenever the clock ticks, and keying on them re-ran this every
    // minute — which, once the cache was half an hour old, re-asked the model and
    // reworded Start Here on an open screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature.key, retryBucket])

  // Checked against the live task list on the way out — see `visibleEntries`.
  const visible = useMemo(
    () => visibleEntries(entries, candidates, local),
    [entries, candidates, local],
  )

  return {
    ...split(visible),
    loading,
    refresh: () => void load(true),
  }
}
