import { CACHE_TTL_MS } from './recommendationCache'
import type { CacheEntry } from './recommendationCache'
import { canReuse, rankingSignature } from './rankingSignature'
import type { Task } from '@/types/entities'

const ZONE = 'America/Chicago'
/** Tuesday 10 Nov 2026, 9:00 AM in Chicago. */
const NOW = Date.UTC(2026, 10, 10, 15, 0)
const HOUR = 60 * 60_000

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  status: 'pending',
  priority: 'medium',
  due_date: '2026-11-10T18:00:00.000Z',
  ...over,
})

const a = task('a')
const b = task('b')
const answeredFor = (tasks: readonly Task[], over: Partial<CacheEntry> = {}): CacheEntry => {
  const { day, lines } = rankingSignature(tasks, NOW, ZONE)
  return {
    recommendations: [{ task_id: 'a', reason: 'Due today' }],
    cachedAtMs: NOW,
    tier: 'paid',
    candidateIds: tasks.map((t) => t.id),
    rankingDay: day,
    rankingLines: lines,
    ...over,
  }
}
const now = (tasks: readonly Task[], at = NOW) => ({
  signature: rankingSignature(tasks, at, ZONE),
  candidates: tasks,
})
const paidAt = (nowMs: number) => ({ nowMs, tier: 'paid' as const })

describe('rankingSignature', () => {
  it('is the same for the same tasks on the same day, in any order and at any minute', () => {
    expect(rankingSignature([a, b], NOW, ZONE).key).toBe(
      rankingSignature([b, a], NOW + 3 * HOUR, ZONE).key,
    )
  })

  it('reads a due date as an instant, whichever way it was written', () => {
    const server = task('a', { due_date: '2026-11-10T18:00:00Z' })
    expect(rankingSignature([server], NOW, ZONE).key).toBe(rankingSignature([a], NOW, ZONE).key)
  })

  it('moves with the day and with the fields the ranking reads, not the title', () => {
    const key = rankingSignature([a], NOW, ZONE).key
    expect(rankingSignature([a], NOW + 24 * HOUR, ZONE).key).not.toBe(key)
    expect(rankingSignature([{ ...a, priority: 'critical' }], NOW, ZONE).key).not.toBe(key)
    expect(rankingSignature([{ ...a, title: 'Renamed' }], NOW, ZONE).key).toBe(key)
  })
})

describe('canReuse', () => {
  it('keeps a model answer for the same tasks however old it is', () => {
    expect(canReuse(answeredFor([a, b]), now([a, b]), paidAt(NOW + 6 * HOUR))).toBe(true)
  })

  it('keeps it when a task is ticked off: the next one simply moves up', () => {
    expect(canReuse(answeredFor([a, b]), now([b]), paidAt(NOW + 6 * HOUR))).toBe(true)
  })

  it('asks again for a new task, at once', () => {
    expect(canReuse(answeredFor([a]), now([a, b]), paidAt(NOW))).toBe(false)
  })

  it('after an edit, keeps it only while under half an hour old', () => {
    const edited = [{ ...a, priority: 'critical' as const }]
    expect(canReuse(answeredFor([a]), now(edited), paidAt(NOW + 10 * 60_000))).toBe(true)
    expect(canReuse(answeredFor([a]), now(edited), paidAt(NOW + CACHE_TTL_MS))).toBe(false)
  })

  it('asks again on a new day', () => {
    const tomorrow = NOW + 24 * HOUR
    expect(canReuse(answeredFor([a]), now([a], tomorrow), paidAt(tomorrow))).toBe(false)
  })

  it('retries a local fallback after half an hour, even with nothing changed', () => {
    const answered = answeredFor([a])
    const fallback: CacheEntry = {
      recommendations: answered.recommendations,
      cachedAtMs: answered.cachedAtMs,
      tier: answered.tier,
      candidateIds: ['a'],
    }
    expect(canReuse(fallback, now([a]), paidAt(NOW + 10 * 60_000))).toBe(true)
    expect(canReuse(fallback, now([a]), paidAt(NOW + CACHE_TTL_MS))).toBe(false)
  })

  it('never serves a free answer to a paid user, or nothing at all', () => {
    expect(canReuse(answeredFor([a], { tier: 'free' }), now([a]), paidAt(NOW))).toBe(false)
    expect(canReuse(null, now([a]), paidAt(NOW))).toBe(false)
  })
})
