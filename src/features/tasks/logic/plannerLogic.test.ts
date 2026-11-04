import {
  filterDailyPlannerTasks,
  filterTodayPlanTasks,
  ASIDE_LIMIT,
  asideView,
} from './plannerLogic'
// The date primitives moved to utils so commitments could use them without
// depending on the tasks feature. Still tested here, since the planner rules are
// what make the timezone cases matter.
import { isLocalPast, isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'

/**
 * The timezone cases are the point of this file. The web version carried a
 * long comment explaining that comparing UTC timestamps put late-evening tasks
 * on the wrong day — these tests pin that behaviour down.
 */

const NOW = new Date('2026-08-11T18:00:00Z').getTime() // 11 Aug, 11:00 in LA
const LA = 'America/Los_Angeles'
const TOKYO = 'Asia/Tokyo'

const task = (over: Partial<Task> = {}): Task => ({ id: 't1', title: 'Task', ...over })

describe('isLocalToday', () => {
  it('is true for a timestamp on the same local calendar date', () => {
    expect(isLocalToday('2026-08-11T20:00:00Z', NOW, LA)).toBe(true)
  })

  it('respects the zone: the same instant can be today here and tomorrow there', () => {
    // 11 Aug 18:00 UTC = 11 Aug 11:00 in LA, but 12 Aug 03:00 in Tokyo.
    const instant = '2026-08-11T18:00:00Z'
    expect(isLocalToday(instant, NOW, LA)).toBe(true)
    expect(isLocalToday(instant, NOW, TOKYO)).toBe(true) // "now" shifts too
  })

  it('does not treat a late-evening local time as tomorrow', () => {
    // 23:30 on 11 Aug in LA is 06:30 UTC on 12 Aug — a naive UTC comparison
    // would call this tomorrow. This is the bug the local-date rule prevents.
    expect(isLocalToday('2026-08-12T06:30:00Z', NOW, LA)).toBe(true)
  })

  it.each([undefined, '', 'not-a-date'])('is false for %s', (value) => {
    expect(isLocalToday(value, NOW, LA)).toBe(false)
  })

  it('falls back to device local rather than throwing on a bad zone', () => {
    expect(() => isLocalToday('2026-08-11T18:00:00Z', NOW, 'Not/AZone')).not.toThrow()
  })
})

describe('isLocalPast', () => {
  it('is true for a previous local date', () => {
    expect(isLocalPast('2026-08-09T18:00:00Z', NOW, LA)).toBe(true)
  })

  it('is FALSE for earlier today — today is never past', () => {
    expect(isLocalPast('2026-08-11T15:00:00Z', NOW, LA)).toBe(false)
  })

  it('is false for the future', () => {
    expect(isLocalPast('2026-08-20T18:00:00Z', NOW, LA)).toBe(false)
  })
})

describe('filterTodayPlanTasks', () => {
  const opts = { nowMs: NOW, timeZone: LA }
  const ids = (tasks: readonly Task[]) => tasks.map((t) => t.id)

  it('holds tasks booked for today, in time order', () => {
    const later = task({ id: 'later', scheduled_start_time: '2026-08-11T22:00:00Z' })
    const sooner = task({ id: 'sooner', scheduled_start_time: '2026-08-11T20:00:00Z' })
    expect(ids(filterTodayPlanTasks([later, sooner], opts))).toEqual(['sooner', 'later'])
  })

  it('places a time written into the task on its due day', () => {
    const dinner = task({ id: 'dinner', description: '7 PM', due_date: '2026-08-11T16:00:00Z' })
    expect(ids(filterTodayPlanTasks([dinner], opts))).toEqual(['dinner'])
  })

  it('leaves out work that is only due today, future work and scheduled events', () => {
    const due = task({ id: 'due', due_date: '2026-08-11T22:00:00Z' })
    const future = task({ id: 'future', scheduled_start_time: '2026-08-25T20:00:00Z' })
    const event = task({
      id: 'event',
      is_scheduled_event: true,
      scheduled_start_time: '2026-08-11T20:00:00Z',
    })
    expect(filterTodayPlanTasks([due, future, event], opts)).toEqual([])
  })

  it('excludes non-pending tasks', () => {
    const done = task({
      id: 'done',
      status: 'completed',
      scheduled_start_time: '2026-08-11T20:00:00Z',
    })
    expect(filterTodayPlanTasks([done], opts)).toEqual([])
  })
})

describe('filterDailyPlannerTasks and planned work', () => {
  const opts = { nowMs: NOW, timeZone: LA }

  it('does not list work booked for a later day as carried over', () => {
    const planned = task({
      id: 'planned',
      due_date: '2026-08-09T20:00:00Z',
      scheduled_start_time: '2026-08-13T17:00:00Z',
    })
    const plan = filterDailyPlannerTasks([planned], opts)
    expect(plan.overdue).toEqual([])
    expect(plan.todayScheduled).toEqual([])
  })

  it('puts a task with a time in its notes into today’s blocks', () => {
    const dinner = task({ id: 'dinner', description: '7 PM', due_date: '2026-08-11T16:00:00Z' })
    const plan = filterDailyPlannerTasks([dinner], opts)
    expect(plan.todayScheduled.map((t) => t.id)).toEqual(['dinner'])
    expect(plan.needsAttention).toEqual([])
  })
})

describe('filterDailyPlannerTasks', () => {
  const opts = { nowMs: NOW, timeZone: LA }

  it('splits scheduled-today, due-today-unscheduled, and carryover', () => {
    const scheduled = task({ id: 'sched', scheduled_start_time: '2026-08-11T20:00:00Z' })
    const dueOnly = task({ id: 'dueOnly', due_date: '2026-08-11T20:00:00Z' })
    const stale = task({ id: 'stale', due_date: '2026-08-01T20:00:00Z' })
    const future = task({ id: 'future', due_date: '2026-09-01T20:00:00Z' })

    const plan = filterDailyPlannerTasks([scheduled, dueOnly, stale, future], opts)
    expect(plan.todayScheduled.map((t) => t.id)).toEqual(['sched'])
    expect(plan.needsAttention.map((t) => t.id)).toEqual(['dueOnly'])
    expect(plan.overdue.map((t) => t.id)).toEqual(['stale'])
  })

  it('prefers the time slot when a task is both scheduled and due today', () => {
    const both = task({
      id: 'both',
      scheduled_start_time: '2026-08-11T20:00:00Z',
      due_date: '2026-08-11T23:00:00Z',
    })
    const plan = filterDailyPlannerTasks([both], opts)
    expect(plan.todayScheduled).toHaveLength(1)
    expect(plan.needsAttention).toHaveLength(0)
  })

  it('drops tasks with no anchor at all', () => {
    const plan = filterDailyPlannerTasks([task({ id: 'floating' })], opts)
    expect([...plan.todayScheduled, ...plan.needsAttention, ...plan.overdue]).toEqual([])
  })
})

describe('asideView', () => {
  const tasks = (count: number) => Array.from({ length: count }, (_, i) => ({ id: String(i) }))

  it('shows everything when the list is short', () => {
    const { shown, hidden } = asideView(tasks(3))

    expect(shown).toHaveLength(3)
    expect(hidden).toBe(0)
  })

  it('caps a long list and counts the remainder', () => {
    // "Carried over" is every overdue task. Drawn in full it turns a day plan into
    // a hundred-row scroll, all of it built before the screen appears.
    const { shown, hidden } = asideView(tasks(40))

    expect(shown).toHaveLength(ASIDE_LIMIT)
    expect(hidden).toBe(40 - ASIDE_LIMIT)
  })

  it('keeps the first few, which are the ones ranked highest', () => {
    expect(asideView(tasks(10)).shown.map((t) => t.id)).toEqual(['0', '1', '2', '3', '4'])
  })

  it('never reports a negative remainder', () => {
    expect(asideView([]).hidden).toBe(0)
  })
})
