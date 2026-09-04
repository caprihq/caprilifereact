import { useCallback, useEffect, useMemo, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import { mmkvPrefStore } from '@/services/storage'
import { logWarn } from '@/utils'
import type { Task } from '@/types/entities'
import { getTaskReason } from '../logic/taskReason'
import {
  FREE_REFRESH_LIMIT,
  RECOMMENDATION_COUNT,
  canRefresh,
  fallbackRecommendations,
  hydrate,
  isFresh,
  refreshCountKey,
} from '../logic/recommendationCache'
import type { CacheEntry } from '../logic/recommendationCache'
import { recommendTasks } from '../services/aiRecommendations'
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
 *  - a **30-minute cache**, so remounting the screen is free;
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

const CACHE_KEY = 'capri.upnext.cache'

const readCache = (): CacheEntry | null => {
  try {
    const raw = mmkvPrefStore.getString(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch (error) {
    // A corrupt cache must cost a refresh, not the screen.
    logWarn('upnext:cache:unreadable', error)
    return null
  }
}

const readCount = (nowMs: number): number =>
  Number.parseInt(mmkvPrefStore.getString(refreshCountKey(nowMs)) ?? '0', 10) || 0

export type UpNextEntry = { readonly task: Task; readonly reason: string }

/** Store the answer so a remount inside the TTL costs nothing. */
const remember = (
  final: readonly UpNextEntry[],
  cachedAtMs: number,
  tier: 'free' | 'paid',
): void => {
  mmkvPrefStore.setString(
    CACHE_KEY,
    JSON.stringify({
      recommendations: final.map((entry) => ({ task_id: entry.task.id, reason: entry.reason })),
      cachedAtMs,
      tier,
    } satisfies CacheEntry),
  )
}

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

export const useUpNext = (request: UpNextRequest) => {
  const { candidates, shortlist, userEmail, nowMs, timeZone } = request
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const tier = hasAccess('analytics') ? 'paid' : 'free'
  const contextSummary = useUserContext({ userEmail, nowMs, timeZone })

  const [entries, setEntries] = useState<readonly UpNextEntry[]>([])
  const [loading, setLoading] = useState(false)

  /** The local ranking, always available and always the fallback. */
  const local = useMemo(
    () =>
      shortlist
        .slice(0, RECOMMENDATION_COUNT)
        .map((task) => ({ task, reason: getTaskReason(task, nowMs) })),
    [shortlist, nowMs],
  )

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
        nowMs,
        contextSummary,
      })
      setLoading(false)

      if (force) {
        mmkvPrefStore.setString(refreshCountKey(nowMs), String(readCount(nowMs) + 1))
      }

      // Hydrated against the full set: the model may well pick something the local
      // pass left out of the shortlist, which is the point of asking it.
      const hydrated = hydrate(recommended ?? fallbackRecommendations(local), candidates)
      const final = hydrated.length > 0 ? hydrated : local

      setEntries(final)
      remember(final, nowMs, tier)
    },
    [candidates, contextSummary, local, nowMs, show, tier, userEmail],
  )

  const load = useCallback(
    (force: boolean) => {
      const cached = readCache()
      if (!force && cached && isFresh(cached, nowMs, tier)) {
        const hydrated = hydrate(cached.recommendations, candidates)
        if (hydrated.length > 0) {
          setEntries(hydrated)
          return
        }
      }
      void ask(force)
    },
    [ask, candidates, nowMs, tier],
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
    // Keyed on the task set, not on `load`: the callback changes identity whenever
    // the clock ticks, which would re-ask the model every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates])

  return {
    ...split(entries.length > 0 ? entries : local),
    loading,
    refresh: () => void load(true),
  }
}
