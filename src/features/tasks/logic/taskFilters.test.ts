import type { Task } from '@/types/entities'
import {
  INACTIVE_STATUSES,
  TASK_FILTERS,
  applyTaskFilter,
  emptyMessageFor,
  isActiveTask,
  isTaskFilter,
} from './taskFilters'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Something',
  ...overrides,
})

/** 2026-03-10T04:00:00Z — 11pm on 9 March in New York. */
const NOW = Date.UTC(2026, 2, 10, 4, 0, 0)
const UTC = { nowMs: NOW, timeZone: 'UTC' }
const NEW_YORK = { nowMs: NOW, timeZone: 'America/New_York' }

describe('filter identity', () => {
  it('recognises only the five known filters', () => {
    for (const filter of TASK_FILTERS) expect(isTaskFilter(filter)).toBe(true)
    expect(isTaskFilter('archived')).toBe(false)
    expect(isTaskFilter(undefined)).toBe(false)
  })

  it('has an empty message for every filter', () => {
    for (const filter of TASK_FILTERS) expect(emptyMessageFor(filter)).not.toBe('')
  })
})

describe('active tasks', () => {
  it('treats a missing status as pending, which is active', () => {
    expect(isActiveTask(task())).toBe(true)
  })

  it('excludes exactly the statuses the web client excluded', () => {
    expect([...INACTIVE_STATUSES].sort()).toEqual(
      ['canceled', 'completed', 'in_progress', 'saved_for_later'].sort(),
    )
  })
})

describe('applyTaskFilter', () => {
  const pending = task({ id: 'pending', status: 'pending' })
  const done = task({ id: 'done', status: 'completed', completed_date: '2026-03-01T00:00:00Z' })
  const doneLater = task({ id: 'doneLater', status: 'completed', completed_date: '2026-03-05T00:00:00Z' })
  const critical = task({ id: 'critical', status: 'pending', priority: 'critical' })
  const high = task({ id: 'high', status: 'pending', priority: 'high' })
  const inProgress = task({ id: 'inProgress', status: 'in_progress' })

  const all = [pending, done, doneLater, critical, high, inProgress]

  it('shows only open work for "all"', () => {
    const ids = applyTaskFilter(all, 'all', UTC).map((entry) => entry.id)
    expect(ids).toEqual(['pending', 'critical', 'high'])
  })

  it('shows only finished work for "completed", newest first', () => {
    const ids = applyTaskFilter(all, 'completed', UTC).map((entry) => entry.id)
    expect(ids).toEqual(['doneLater', 'done'])
  })

  it('filters by priority without including inactive tasks', () => {
    expect(applyTaskFilter(all, 'critical', UTC).map((entry) => entry.id)).toEqual(['critical'])
    expect(applyTaskFilter(all, 'high', UTC).map((entry) => entry.id)).toEqual(['high'])

    const completedCritical = task({ id: 'x', status: 'completed', priority: 'critical' })
    expect(applyTaskFilter([completedCritical], 'critical', UTC)).toEqual([])
  })

  it('never mutates the input array', () => {
    const original = [...all]
    applyTaskFilter(all, 'completed', UTC)
    expect(all).toEqual(original)
  })

  it('preserves server ranking order for non-completed filters', () => {
    const ordered = [high, critical, pending]
    expect(applyTaskFilter(ordered, 'all', UTC).map((entry) => entry.id)).toEqual([
      'high',
      'critical',
      'pending',
    ])
  })
})

describe('the "today" filter uses the user timezone', () => {
  // Due 2026-03-10T02:00Z: still 9 March in New York, already 10 March in UTC.
  const dueEarlyUtc = task({ status: 'pending', due_date: '2026-03-10T02:00:00Z' })

  it('counts it as today in UTC', () => {
    expect(applyTaskFilter([dueEarlyUtc], 'today', UTC)).toHaveLength(1)
  })

  it('does not count it as today in New York', () => {
    // The web version compared device-local dates and got this wrong.
    expect(applyTaskFilter([dueEarlyUtc], 'today', NEW_YORK)).toHaveLength(0)
  })

  it('ignores tasks with no due date', () => {
    expect(applyTaskFilter([task({ status: 'pending' })], 'today', UTC)).toHaveLength(0)
  })
})
