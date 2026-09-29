import {
  CACHE_TTL_MS,
  FREE_REFRESH_LIMIT,
  RECOMMENDATION_COUNT,
  canRefresh,
  fallbackRecommendations,
  hasNewCandidates,
  hydrate,
  isFresh,
  refreshCountKey,
  topUpEntries,
} from './recommendationCache'
import type { CacheEntry } from './recommendationCache'
import type { Task } from '@/types/entities'

const NOW = Date.parse('2026-08-29T12:00:00Z')

const task = (id: string): Task => ({ id, title: `Task ${id}`, status: 'pending' })

const entry = (overrides: Partial<CacheEntry> = {}): CacheEntry => ({
  recommendations: [{ task_id: 'a', reason: 'Due today' }],
  cachedAtMs: NOW,
  tier: 'free',
  ...overrides,
})

describe('isFresh', () => {
  it('serves a recent answer rather than paying for the same one twice', () => {
    expect(isFresh(entry(), NOW + 60_000, 'free')).toBe(true)
  })

  it('expires at the TTL', () => {
    expect(isFresh(entry(), NOW + CACHE_TTL_MS - 1, 'free')).toBe(true)
    expect(isFresh(entry(), NOW + CACHE_TTL_MS, 'free')).toBe(false)
  })

  it('discards an answer produced for a different plan', () => {
    // The user upgraded mid-session: serving the free-tier answer would give them
    // the cheaper result they just paid to stop getting.
    expect(isFresh(entry({ tier: 'free' }), NOW, 'paid')).toBe(false)
    expect(isFresh(null, NOW, 'free')).toBe(false)
  })
})

describe('refreshCountKey', () => {
  it('changes at the calendar day, so the budget resets overnight', () => {
    expect(refreshCountKey(NOW)).toBe('upnext_refreshes_2026-08-29')
    expect(refreshCountKey(NOW + 24 * 60 * 60 * 1000)).toBe('upnext_refreshes_2026-08-30')
  })
})

describe('canRefresh', () => {
  it('caps the free plan and never caps a paid one', () => {
    expect(canRefresh(FREE_REFRESH_LIMIT - 1, 'free')).toBe(true)
    expect(canRefresh(FREE_REFRESH_LIMIT, 'free')).toBe(false)
    expect(canRefresh(999, 'paid')).toBe(true)
  })
})

describe('hydrate', () => {
  it('drops recommendations whose task is gone', () => {
    // A cached id can outlive its task: completed, deleted, or filtered out. Showing
    // a stale copy would let a finished task sit in Up Next until the TTL expires.
    const live = [task('a'), task('c')]
    const cached = [
      { task_id: 'a', reason: 'first' },
      { task_id: 'b', reason: 'gone' },
      { task_id: 'c', reason: 'third' },
    ]

    expect(hydrate(cached, live).map((entry) => entry.task.id)).toEqual(['a', 'c'])
  })
})

describe('fallbackRecommendations', () => {
  it('keeps the card populated when the model cannot answer', () => {
    // An Up Next that empties itself on a failed network call reads as "no work
    // left", which is the opposite of the truth.
    const ranked = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ task: task(id), reason: `why ${id}` }))
    const fallback = fallbackRecommendations(ranked)

    // Four: the Start Here hero plus three Up Next rows, from one answer.
    expect(fallback).toHaveLength(4)
    expect(fallback[0]).toEqual({ task_id: 'a', reason: 'why a' })
  })
})

describe('topUpEntries', () => {
  const entry = (id: string) => ({ task: { id } as Task, reason: 'r' })

  it('keeps the model\'s order and fills the rest from the local ranking', () => {
    // The whole point: a short answer must not leave the queue empty.
    const result = topUpEntries([entry('b')], [entry('a'), entry('b'), entry('c')])

    expect(result.map((e) => e.task.id)).toEqual(['b', 'a', 'c'])
  })

  it('never lists the same task twice', () => {
    const result = topUpEntries([entry('a')], [entry('a')])

    expect(result.map((e) => e.task.id)).toEqual(['a'])
  })

  it('falls back entirely to local when nothing survived hydration', () => {
    // Every cached recommendation pointed at a task since deleted.
    const result = topUpEntries([], [entry('a'), entry('b')])

    expect(result.map((e) => e.task.id)).toEqual(['a', 'b'])
  })

  it('leaves a full answer untouched', () => {
    const full = [entry('a'), entry('b'), entry('c'), entry('d')]

    expect(topUpEntries(full, [entry('e')])).toEqual(full)
  })

  it('never returns more than the limit', () => {
    const result = topUpEntries([entry('a')], [entry('b'), entry('c'), entry('d'), entry('e')])

    expect(result).toHaveLength(RECOMMENDATION_COUNT)
  })

  it('returns nothing when there is nothing anywhere', () => {
    expect(topUpEntries([], [])).toEqual([])
  })
})

describe('hasNewCandidates', () => {
  const task = (id: string) => ({ id }) as Task
  const entry = (candidateIds?: readonly string[]) =>
    ({ recommendations: [], cachedAtMs: 0, tier: 'free', candidateIds }) as CacheEntry

  it('spots a task created since the ranking was made', () => {
    // The whole reason this exists: a task added after the last answer was landing
    // at the bottom of Up Next however urgent it was.
    expect(hasNewCandidates(entry(['a', 'b']), [task('a'), task('b'), task('c')])).toBe(true)
  })

  it('is quiet when the same tasks are still there', () => {
    expect(hasNewCandidates(entry(['a', 'b']), [task('a'), task('b')])).toBe(false)
  })

  it('ignores a task that disappeared', () => {
    // Completing something must not spend a model call; hydrate and topUp cover it.
    expect(hasNewCandidates(entry(['a', 'b']), [task('a')])).toBe(false)
  })

  it('treats an entry from an older build as current', () => {
    // No recorded list is not the same as an empty one — re-asking for every user on
    // the first launch after an update would be a needless burst of traffic.
    expect(hasNewCandidates(entry(undefined), [task('a')])).toBe(false)
  })

  it('has nothing to compare without an entry', () => {
    expect(hasNewCandidates(null, [task('a')])).toBe(false)
  })
})

describe('topUpEntries — a task that has gone', () => {
  const entry = (id: string) => ({ task: { id } as Task, reason: 'r' })

  it('is how a deleted task leaves the screen in the same render', () => {
    // `useUpNext` filters its stored answer against the live task list and feeds the
    // survivors through here. With none left, `local` is empty too, so the hero
    // becomes null and Start Here says so — rather than going on showing a task the
    // user just deleted.
    expect(topUpEntries([], [])).toEqual([])
  })

  it('promotes the next task when the one in front is deleted', () => {
    const survivors = [entry('b')]

    expect(topUpEntries(survivors, [entry('b'), entry('c')]).map((e) => e.task.id)).toEqual([
      'b',
      'c',
    ])
  })
})
