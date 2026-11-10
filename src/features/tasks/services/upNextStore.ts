import { mmkvPrefStore } from '@/services/storage'
import type { Task } from '@/types/entities'
import { logWarn } from '@/utils'
import { refreshCountKey } from '../logic/recommendationCache'
import type { CacheEntry } from '../logic/recommendationCache'

/**
 * Up Next's saved answer and its daily refresh count.
 *
 * Split from `useUpNext` so the hook stays inside the file limit (§3.2). The rules
 * about what the cache means live in `logic/recommendationCache`; this only reads and
 * writes it.
 */

const CACHE_KEY = 'capri.upnext.cache'

export type UpNextEntry = { readonly task: Task; readonly reason: string }

export const readCache = (): CacheEntry | null => {
  try {
    const raw = mmkvPrefStore.getString(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch (error) {
    // A corrupt cache must cost a refresh, not the screen.
    logWarn('upnext:cache:unreadable', error)
    return null
  }
}

export const readCount = (nowMs: number): number =>
  Number.parseInt(mmkvPrefStore.getString(refreshCountKey(nowMs)) ?? '0', 10) || 0

export const countRefresh = (nowMs: number): void => {
  mmkvPrefStore.setString(refreshCountKey(nowMs), String(readCount(nowMs) + 1))
}

/** Store the answer so a remount inside the TTL costs nothing. */
/** Five values travel together, so they arrive as one (§3.2 max-params). */
export const remember = (entry: {
  readonly final: readonly UpNextEntry[]
  readonly cachedAtMs: number
  readonly tier: 'free' | 'paid'
  readonly candidateIds: readonly string[]
  /** What a model answer was given for; null for the local fallback. */
  readonly ranking: { readonly day: string; readonly lines: readonly string[] } | null
}): void => {
  mmkvPrefStore.setString(
    CACHE_KEY,
    JSON.stringify({
      recommendations: entry.final.map((item) => ({
        task_id: item.task.id,
        reason: item.reason,
      })),
      cachedAtMs: entry.cachedAtMs,
      tier: entry.tier,
      candidateIds: entry.candidateIds,
      ...(entry.ranking
        ? { rankingDay: entry.ranking.day, rankingLines: entry.ranking.lines }
        : {}),
    } satisfies CacheEntry),
  )
}
