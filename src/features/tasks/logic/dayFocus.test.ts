import { currentReason, currentTask, homeFocus, rankableTasks } from './dayFocus'
import type { Task } from '@/types/entities'

const ZONE = 'America/Chicago'
/** 28 Oct 2026, 10:45 in Chicago. */
const NOW = Date.UTC(2026, 9, 28, 15, 45)
const iso = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 28, hour + 5, minute)).toISOString()
const when = { nowMs: NOW, timeZone: ZONE }
const task = (over: Partial<Task>): Task => ({
  id: 't',
  title: 'Task',
  status: 'pending',
  ...over,
})
const ids = (tasks: readonly Task[]) => tasks.map((t) => t.id)

describe('rankableTasks', () => {
  it('keeps unplanned work', () => {
    expect(ids(rankableTasks([task({ id: 'work', due_date: iso(9) })], when))).toEqual(['work'])
  })

  it('leaves out appointments: scheduled events and tasks with a written time', () => {
    const event = task({ id: 'event', is_scheduled_event: true, scheduled_start_time: iso(13) })
    const dinner = task({
      id: 'dinner',
      title: 'Dinner with friends',
      description: '7 PM',
      due_date: iso(9),
    })
    expect(rankableTasks([event, dinner], when)).toEqual([])
  })

  it('leaves out work booked for later, and the work booked for now', () => {
    const later = task({
      id: 'later',
      scheduled_start_time: iso(13),
      scheduled_end_time: iso(14),
    })
    const now = task({
      id: 'now',
      scheduled_start_time: iso(10, 30),
      scheduled_end_time: iso(11, 30),
    })
    expect(rankableTasks([later, now], when)).toEqual([])
  })

  it('brings back work whose booked time passed without it being done', () => {
    const missed = task({
      id: 'missed',
      scheduled_start_time: iso(8),
      scheduled_end_time: iso(9),
    })
    expect(ids(rankableTasks([missed], when))).toEqual(['missed'])
  })

  it('ignores finished work', () => {
    expect(rankableTasks([task({ id: 'done', status: 'completed' })], when)).toEqual([])
  })
})

describe('currentTask', () => {
  it('finds the flexible task booked for right now, earliest first', () => {
    const a = task({
      id: 'a',
      scheduled_start_time: iso(10, 30),
      scheduled_end_time: iso(11, 30),
    })
    const b = task({ id: 'b', scheduled_start_time: iso(10), scheduled_end_time: iso(11) })
    expect(currentTask([a, b], when)?.id).toBe('b')
  })

  it('uses the estimate when the block has no end', () => {
    const open = task({ id: 'open', scheduled_start_time: iso(10, 30), estimated_minutes: 30 })
    expect(currentTask([open], when)?.id).toBe('open')
    const over = task({ id: 'over', scheduled_start_time: iso(10), estimated_minutes: 30 })
    expect(currentTask([over], when)).toBeNull()
  })

  it('never picks a scheduled event', () => {
    const event = task({
      is_scheduled_event: true,
      scheduled_start_time: iso(10, 30),
      scheduled_end_time: iso(11),
    })
    expect(currentTask([event], when)).toBeNull()
  })
})

describe('currentReason', () => {
  it('says when the block ends', () => {
    const block = task({ scheduled_start_time: iso(10, 30), scheduled_end_time: iso(11, 30) })
    expect(currentReason(block, ZONE)).toBe('Planned for now, until 11:30 AM.')
  })
})

describe('homeFocus', () => {
  const pick = { task: task({ id: 'pick' }), reason: 'CAPRI says so.' }
  const queued = [1, 2, 3].map((n) => ({ task: task({ id: `q${String(n)}` }), reason: '' }))

  it('puts the task booked for now first and moves CAPRI’s pick to the front of Up Next', () => {
    const current = task({
      id: 'now',
      scheduled_start_time: iso(10, 30),
      scheduled_end_time: iso(11),
    })
    const focus = homeFocus({ current, pick, fallback: null, queue: queued, timeZone: ZONE })

    expect(focus.hero?.id).toBe('now')
    expect(focus.reason).toBe('Planned for now, until 11:00 AM.')
    expect(focus.queue.map((entry) => entry.task.id)).toEqual(['pick', 'q1', 'q2'])
  })

  it('otherwise shows CAPRI’s pick, or the local one until it answers', () => {
    expect(
      homeFocus({ current: null, pick, fallback: null, queue: [], timeZone: ZONE }),
    ).toMatchObject({
      hero: { id: 'pick' },
      reason: 'CAPRI says so.',
    })
    const local = task({ id: 'local' })
    expect(
      homeFocus({ current: null, pick: null, fallback: local, queue: [], timeZone: ZONE }),
    ).toMatchObject({
      hero: { id: 'local' },
      reason: null,
    })
  })
})
