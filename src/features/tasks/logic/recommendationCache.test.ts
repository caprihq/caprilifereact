import {
  CACHE_TTL_MS,
  FREE_REFRESH_LIMIT,
  canRefresh,
  fallbackRecommendations,
  hydrate,
  isFresh,
  refreshCountKey,
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
