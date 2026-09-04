import { topPrioritiesCleared } from './milestone'
import type { Task } from '@/types/entities'

const NOW = Date.parse('2026-08-29T15:00:00Z')
const UTC = { nowMs: NOW, timeZone: 'UTC' }

const task = (overrides: Partial<Task>): Task => ({
  id: Math.random().toString(),
  title: 'Task',
  status: 'pending',
  ...overrides,
})

const doneToday = (priority: NonNullable<Task['priority']>) =>
  task({ priority, status: 'completed', completed_date: '2026-08-29T12:00:00Z' })

describe('topPrioritiesCleared', () => {
  it('fires when every critical and high task is done, one of them today', () => {
    expect(topPrioritiesCleared([doneToday('critical'), doneToday('high')], UTC)).toBe(true)
  })

  it('stays quiet while one is still outstanding', () => {
    // Congratulating someone mid-list is worse than saying nothing.
    const list = [doneToday('critical'), task({ priority: 'high' })]
    expect(topPrioritiesCleared(list, UTC)).toBe(false)
  })

  it('stays quiet for work finished on an earlier day', () => {
    // Otherwise it fires every morning for anyone whose urgent work is already done.
    const yesterday = task({
      priority: 'critical',
      status: 'completed',
      completed_date: '2026-08-28T12:00:00Z',
    })
    expect(topPrioritiesCleared([yesterday], UTC)).toBe(false)
  })

  it('stays quiet when there was never anything urgent', () => {
    expect(topPrioritiesCleared([task({ priority: 'medium' })], UTC)).toBe(false)
    expect(topPrioritiesCleared([], UTC)).toBe(false)
  })

  it('does not count a cancelled task as outstanding', () => {
    // Cancelling is a decision, not unfinished work.
    const list = [doneToday('high'), task({ priority: 'critical', status: 'canceled' })]
    expect(topPrioritiesCleared(list, UTC)).toBe(true)
  })

  it('uses the user zone for "today"', () => {
    // Completed 23:00 UTC: still the 29th in London, already the 30th in Tokyo.
    const late = task({
      priority: 'critical',
      status: 'completed',
      completed_date: '2026-08-29T23:00:00Z',
    })
    const nowMs = Date.parse('2026-08-29T23:30:00Z')

    expect(topPrioritiesCleared([late], { nowMs, timeZone: 'Europe/London' })).toBe(true)
    expect(topPrioritiesCleared([late], { nowMs, timeZone: 'Asia/Tokyo' })).toBe(true)
  })
})
