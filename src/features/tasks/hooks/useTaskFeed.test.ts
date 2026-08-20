import { rankTasks } from '@/features/tasks/logic/capriScoring'
import { filterTodayPlanTasks } from '@/features/tasks/logic/plannerLogic'
import type { Task } from '@/types/entities'

/**
 * useTaskFeed is a composition of already-tested pure functions plus React
 * Query. Rather than mount it, these tests pin down the composition rules it
 * relies on — the ones a refactor could silently break.
 */

const NOW = new Date('2026-08-11T18:00:00Z').getTime()
const LA = 'America/Los_Angeles'
const DAY = 24 * 60 * 60 * 1000
const at = (days: number) => new Date(NOW + days * DAY).toISOString()

const task = (over: Partial<Task> = {}): Task => ({ id: 't', title: 'Task', ...over })

const INACTIVE = new Set(['completed', 'in_progress', 'saved_for_later', 'canceled'])
const actionable = (tasks: readonly Task[]) =>
  tasks.filter((t) => !INACTIVE.has(t.status ?? 'pending') && !t.is_scheduled_event)

describe('feed composition', () => {
  it('excludes scheduled events from ranking — they are commitments, not work', () => {
    const meeting = task({ id: 'meeting', is_scheduled_event: true, due_date: at(-1) })
    const real = task({ id: 'real', due_date: at(0.2) })

    const ranked = rankTasks(actionable([meeting, real]), { nowMs: NOW })
    expect(ranked.map((r) => r.task_id)).toEqual(['real'])
  })

  it('excludes deferred and cancelled work from the hero slot', () => {
    const tasks = [
      task({ id: 'later', status: 'saved_for_later', due_date: at(-5) }),
      task({ id: 'gone', status: 'canceled', due_date: at(-5) }),
      task({ id: 'live', status: 'pending' }),
    ]
    const ranked = rankTasks(actionable(tasks), { nowMs: NOW })
    expect(ranked.map((r) => r.task_id)).toEqual(['live'])
  })

  it('splits hero from up-next without repeating the hero', () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      task({ id: `t${String(i)}`, due_date: at(i) }),
    )
    const ranked = rankTasks(actionable(tasks), { nowMs: NOW, limit: 4 })
    const hero = ranked[0]?.task
    const upNext = ranked.slice(1, 4).map((r) => r.task)

    expect(hero).toBeDefined()
    expect(upNext).toHaveLength(3)
    expect(upNext.map((t) => t.id)).not.toContain(hero?.id)
  })

  it('pins the hero into Today even when it has no date of its own', () => {
    const hero = task({ id: 'hero' })
    const plan = filterTodayPlanTasks([hero], {
      nowMs: NOW,
      timeZone: LA,
      recommendedTaskId: 'hero',
    })
    expect([...plan.todayTasks, ...plan.recommendedExtra].map((t) => t.id)).toEqual(['hero'])
  })

  it('an empty task list yields no hero rather than throwing', () => {
    expect(rankTasks([], { nowMs: NOW })[0]).toBeUndefined()
  })

  it('a list of only completed tasks yields no hero', () => {
    const done = [task({ id: 'a', status: 'completed' }), task({ id: 'b', status: 'completed' })]
    expect(rankTasks(actionable(done), { nowMs: NOW })).toHaveLength(0)
  })
})
