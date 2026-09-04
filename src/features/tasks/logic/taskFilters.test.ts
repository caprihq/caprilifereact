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
  it('recognises only the known filters', () => {
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

  it('counts a started task as active, unlike the web client', () => {
    // The web client's list has `in_progress` in it, which hides a task you are in
    // the middle of doing from *every* list: not All, not Today, not a priority
    // chip, and not Done, because Done means completed. Nothing in this app sets the
    // status, so a task carrying it could not be completed, deferred or cancelled
    // either. This divergence is the fix for that.
    expect(INACTIVE_STATUSES.has('in_progress')).toBe(false)
    expect([...INACTIVE_STATUSES].sort()).toEqual(
      ['canceled', 'completed', 'saved_for_later'].sort(),
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

  it('shows everything under "all", finished work included', () => {
    // "All" that hides most of a list is a filter pretending to be the absence of
    // one. Completed tasks stay until they are deleted; the sort sinks them.
    const ids = applyTaskFilter(all, 'all', UTC).map((entry) => entry.id)

    expect(ids).toEqual(['critical', 'high', 'pending', 'inProgress', 'doneLater', 'done'])
  })

  it('makes deferred work retrievable under "later"', () => {
    // Swiping Later sets `saved_for_later`, which is inactive and so absent from
    // every other filter. Without this chip the task left the app for good, and the
    // undo toast is gone within seconds.
    const deferred = task({ id: 'deferred', status: 'saved_for_later' })
    const ids = applyTaskFilter([...all, deferred], 'later', UTC).map((entry) => entry.id)

    expect(ids).toEqual(['deferred'])
  })

  it('gives every priority a filter, including the default one', () => {
    // Medium is what the form applies when nobody chooses, so a bar without it
    // cannot filter for most of a real list.
    const medium = task({ id: 'medium', status: 'pending', priority: 'medium' })
    const low = task({ id: 'low', status: 'pending', priority: 'low' })
    const unset = task({ id: 'unset', status: 'pending' })
    const list = [medium, low, unset]

    // An unset priority counts as medium, matching how the card and the sort read it.
    expect(applyTaskFilter(list, 'medium', UTC).map((e) => e.id)).toEqual(['medium', 'unset'])
    expect(applyTaskFilter(list, 'low', UTC).map((e) => e.id)).toEqual(['low'])
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

  it('ranks by priority band, not by the order the server returned', () => {
    // The server sorts on `-priority_score` alone, which can put a high-scoring low
    // priority task above a critical one. A list with "low" at the top reads as
    // broken however defensible the score is, so the web client re-sorts and so do
    // we.
    const ordered = [high, critical, pending]
    expect(applyTaskFilter(ordered, 'all', UTC).map((entry) => entry.id)).toEqual([
      'critical',
      'high',
      'pending',
    ])
  })

  it('sinks completed work, then bands, then score', () => {
    const lowLoud = task({ id: 'lowLoud', status: 'pending', priority: 'low', priority_score: 99 })
    const highQuiet = task({ id: 'highQuiet', status: 'pending', priority: 'high', priority_score: 1 })
    const highLoud = task({ id: 'highLoud', status: 'pending', priority: 'high', priority_score: 80 })

    const ids = applyTaskFilter([lowLoud, highQuiet, highLoud], 'all', UTC).map((e) => e.id)

    // Band first: both high tasks outrank the loud low one. Score only breaks ties
    // inside a band.
    expect(ids).toEqual(['highLoud', 'highQuiet', 'lowLoud'])
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
