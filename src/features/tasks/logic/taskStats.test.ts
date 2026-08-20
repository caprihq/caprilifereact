import type { Task } from '@/types/entities'
import { EMPTY_STATS, computeTaskStats } from './taskStats'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Something',
  ...overrides,
})

const NOW = Date.UTC(2026, 2, 10, 4, 0, 0)
const UTC = { nowMs: NOW, timeZone: 'UTC' }
const NEW_YORK = { nowMs: NOW, timeZone: 'America/New_York' }

describe('computeTaskStats', () => {
  it('returns zeros for an empty list', () => {
    expect(computeTaskStats([], UTC)).toEqual(EMPTY_STATS)
  })

  it('counts a missing status as pending', () => {
    expect(computeTaskStats([task()], UTC).pending).toBe(1)
  })

  it('separates pending from in-progress', () => {
    const stats = computeTaskStats(
      [task({ status: 'pending' }), task({ status: 'in_progress' }), task({ status: 'in_progress' })],
      UTC,
    )
    expect(stats.pending).toBe(1)
    expect(stats.inProgress).toBe(2)
  })

  it('excludes completed tasks from due-today and critical', () => {
    const stats = computeTaskStats(
      [
        task({ status: 'completed', due_date: '2026-03-10T12:00:00Z', priority: 'critical' }),
        task({ status: 'pending', due_date: '2026-03-10T12:00:00Z', priority: 'critical' }),
      ],
      UTC,
    )
    expect(stats.dueToday).toBe(1)
    expect(stats.critical).toBe(1)
  })

  it('counts a saved-for-later critical task, matching the web client', () => {
    // The web version excluded only `completed`, not every inactive status.
    const stats = computeTaskStats([task({ status: 'saved_for_later', priority: 'critical' })], UTC)
    expect(stats.critical).toBe(1)
  })

  it('resolves due-today in the user timezone, not the device one', () => {
    const dueEarlyUtc = [task({ status: 'pending', due_date: '2026-03-10T02:00:00Z' })]
    expect(computeTaskStats(dueEarlyUtc, UTC).dueToday).toBe(1)
    expect(computeTaskStats(dueEarlyUtc, NEW_YORK).dueToday).toBe(0)
  })

  it('ignores an unreadable due date', () => {
    expect(computeTaskStats([task({ status: 'pending', due_date: 'nonsense' })], UTC).dueToday).toBe(0)
  })
})
