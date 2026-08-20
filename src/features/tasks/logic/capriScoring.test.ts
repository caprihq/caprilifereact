import {
  NO_SIGNALS,
  getEffort,
  getImportance,
  getUrgency,
  rankTasks,
  scoreTask,
} from './capriScoring'
import type { BehaviouralSignals } from './capriScoring'
import { getTaskReason } from './taskReason'
import type { Task } from '@/types/entities'

/**
 * The scoring engine is the product's core IP and had zero tests on the web
 * side — its storage reads made it untestable. Making it pure fixed that, so
 * here is the coverage it never had.
 */

const NOW = new Date('2026-08-11T12:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000
const at = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString()

const task = (over: Partial<Task> = {}): Task => ({ id: 't1', title: 'Task', ...over })

const signals = (over: Partial<BehaviouralSignals> = {}): BehaviouralSignals => ({
  ...NO_SIGNALS,
  ...over,
})

describe('getUrgency', () => {
  it.each([
    ['overdue', at(-1), 5],
    ['due today', at(0.5), 4],
    ['due in 2 days', at(2), 3],
    ['due in 4 days', at(4), 2],
    ['far future', at(30), 1],
  ])('%s → %s', (_label, due, expected) => {
    expect(getUrgency(task({ due_date: due }), NOW)).toBe(expected)
  })

  it('treats a missing due date as least urgent', () => {
    expect(getUrgency(task(), NOW)).toBe(1)
  })

  it('does not throw on an unparseable date', () => {
    expect(getUrgency(task({ due_date: 'not-a-date' }), NOW)).toBe(1)
  })
})

describe('getImportance / getEffort', () => {
  it.each([
    ['critical', 3],
    ['high', 3],
    ['medium', 2],
    ['low', 1],
  ] as const)('priority %s → %s', (priority, expected) => {
    expect(getImportance(task({ priority }))).toBe(expected)
  })

  it('scores shorter tasks higher — quick wins first', () => {
    expect(getEffort(task({ estimated_minutes: 15 }))).toBe(3)
    expect(getEffort(task({ estimated_minutes: 45 }))).toBe(2)
    expect(getEffort(task({ estimated_minutes: 120 }))).toBe(1)
  })

  it('treats unknown effort as neutral, not best or worst', () => {
    expect(getEffort(task())).toBe(2)
  })
})

describe('scoreTask', () => {
  it('applies the documented formula', () => {
    // overdue(5)×3 + high(3)×2 + <30min(3) = 24
    const t = task({ due_date: at(-1), priority: 'high', estimated_minutes: 20 })
    expect(scoreTask(t, NOW)).toBe(24)
  })

  it('adds the recent-interaction boost', () => {
    const t = task({ priority: 'low' })
    const base = scoreTask(t, NOW)
    const boosted = scoreTask(t, NOW, signals({ recentlyTouched: new Set(['t1']) }))
    expect(boosted - base).toBeCloseTo(0.5)
  })

  it('subtracts for repeatedly ignored', () => {
    const t = task({ priority: 'low' })
    const penalised = scoreTask(t, NOW, signals({ repeatedlyIgnored: new Set(['t1']) }))
    expect(penalised - scoreTask(t, NOW)).toBeCloseTo(-0.5)
  })

  it('adds for a favoured category', () => {
    const t = task({ category: 'work' })
    const boosted = scoreTask(t, NOW, signals({ favouredCategories: new Set(['work']) }))
    expect(boosted - scoreTask(t, NOW)).toBeCloseTo(0.3)
  })
})

describe('rankTasks', () => {
  it('orders by score, highest first', () => {
    const urgent = task({ id: 'urgent', due_date: at(-1), priority: 'high' })
    const later = task({ id: 'later', due_date: at(20), priority: 'low' })
    const ranked = rankTasks([later, urgent], { nowMs: NOW })
    expect(ranked[0]?.task_id).toBe('urgent')
    expect(ranked[0]?.rank).toBe(1)
  })

  it('excludes completed and cancelled tasks', () => {
    const tasks = [
      task({ id: 'done', status: 'completed' }),
      task({ id: 'gone', status: 'canceled' }),
      task({ id: 'live', status: 'pending' }),
    ]
    const ranked = rankTasks(tasks, { nowMs: NOW })
    expect(ranked.map((r) => r.task_id)).toEqual(['live'])
  })

  it('enforces the critical rule: a no-deadline task cannot hold slot #1', () => {
    // A quick, high-priority task with no date would otherwise outscore a
    // bulky task due tomorrow.
    const noDate = task({ id: 'noDate', priority: 'critical', estimated_minutes: 10 })
    const dueSoon = task({ id: 'dueSoon', priority: 'low', estimated_minutes: 240, due_date: at(1) })

    const ranked = rankTasks([noDate, dueSoon], { nowMs: NOW })
    expect(ranked[0]?.task_id).toBe('dueSoon')
    // Demoted, not dropped.
    expect(ranked.map((r) => r.task_id)).toContain('noDate')
  })

  it('leaves ordering alone when nothing is urgent', () => {
    const a = task({ id: 'a', priority: 'high' })
    const b = task({ id: 'b', priority: 'low' })
    expect(rankTasks([b, a], { nowMs: NOW })[0]?.task_id).toBe('a')
  })

  it('respects the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}` }))
    expect(rankTasks(many, { nowMs: NOW, limit: 3 })).toHaveLength(3)
  })

  it('returns empty for no active tasks', () => {
    expect(rankTasks([], { nowMs: NOW })).toEqual([])
    expect(rankTasks([task({ status: 'completed' })], { nowMs: NOW })).toEqual([])
  })

  it('NEVER mutates the caller array — the web version did', () => {
    const a = task({ id: 'a', priority: 'low' })
    const b = task({ id: 'b', priority: 'critical', due_date: at(-1) })
    const input = [a, b]
    const snapshot = [...input]
    rankTasks(input, { nowMs: NOW })
    expect(input).toEqual(snapshot)
  })
})

describe('getTaskReason', () => {
  it('is stable for the same task — must not change between renders', () => {
    const t = task({ id: 'stable-id', due_date: at(-1) })
    const first = getTaskReason(t, NOW)
    expect(getTaskReason(t, NOW)).toBe(first)
    expect(getTaskReason(t, NOW)).toBe(first)
  })

  it('leads with urgency', () => {
    const overdue = getTaskReason(task({ id: 'a', due_date: at(-2) }), NOW)
    expect(overdue.length).toBeGreaterThan(0)
    // A distant low-priority task must not get overdue wording.
    const relaxed = getTaskReason(task({ id: 'a', due_date: at(40), priority: 'low' }), NOW)
    expect(relaxed).not.toBe(overdue)
  })

  it('acknowledges tasks the user keeps skipping', () => {
    const t = task({ id: 'skipped', priority: 'low' })
    const reason = getTaskReason(t, NOW, signals({ repeatedlyIgnored: new Set(['skipped']) }))
    expect(reason).not.toBe(getTaskReason(t, NOW))
  })

  it('always returns non-empty copy for any task shape', () => {
    for (const t of [
      task(),
      task({ priority: 'low' }),
      task({ estimated_minutes: 5 }),
      task({ estimated_minutes: 500, priority: 'high' }),
      task({ due_date: at(1.5) }),
    ]) {
      expect(getTaskReason(t, NOW).length).toBeGreaterThan(0)
    }
  })
})
