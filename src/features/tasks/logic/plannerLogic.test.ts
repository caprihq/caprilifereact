import { filterDailyPlannerTasks, filterTodayPlanTasks } from './plannerLogic'
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

  it('includes tasks scheduled or due today', () => {
    const scheduled = task({ id: 'sched', scheduled_start_time: '2026-08-11T20:00:00Z' })
    const due = task({ id: 'due', due_date: '2026-08-11T22:00:00Z' })
    const future = task({ id: 'future', due_date: '2026-08-25T20:00:00Z' })

    const { todayTasks } = filterTodayPlanTasks([scheduled, due, future], opts)
    expect(todayTasks.map((t) => t.id).sort()).toEqual(['due', 'sched'])
  })

  it('excludes non-pending tasks', () => {
    const done = task({ id: 'done', status: 'completed', due_date: '2026-08-11T20:00:00Z' })
    expect(filterTodayPlanTasks([done], opts).todayTasks).toEqual([])
  })

  it('surfaces the recommended task separately when it has no today anchor', () => {
    const rec = task({ id: 'rec' })
    const result = filterTodayPlanTasks([rec], { ...opts, recommendedTaskId: 'rec' })
    expect(result.todayTasks).toEqual([])
    expect(result.recommendedExtra.map((t) => t.id)).toEqual(['rec'])
  })

  it('does not duplicate the recommended task when it is already anchored today', () => {
    const rec = task({ id: 'rec', due_date: '2026-08-11T20:00:00Z' })
    const result = filterTodayPlanTasks([rec], { ...opts, recommendedTaskId: 'rec' })
    expect(result.todayTasks).toHaveLength(1)
    expect(result.recommendedExtra).toHaveLength(0)
  })

  it('sorts by time, scheduled start taking precedence over due date', () => {
    const late = task({ id: 'late', scheduled_start_time: '2026-08-11T23:00:00Z' })
    const early = task({ id: 'early', scheduled_start_time: '2026-08-11T16:00:00Z' })
    const { todayTasks } = filterTodayPlanTasks([late, early], opts)
    expect(todayTasks.map((t) => t.id)).toEqual(['early', 'late'])
  })

  it('does not mutate the input array', () => {
    const input = [
      task({ id: 'b', scheduled_start_time: '2026-08-11T23:00:00Z' }),
      task({ id: 'a', scheduled_start_time: '2026-08-11T16:00:00Z' }),
    ]
    const snapshot = [...input]
    filterTodayPlanTasks(input, opts)
    expect(input).toEqual(snapshot)
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
