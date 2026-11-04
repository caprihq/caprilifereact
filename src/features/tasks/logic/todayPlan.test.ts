import type { TimelineItem } from '@/features/commitments'
import type { Task } from '@/types/entities'
import { MAX_PLAN_ROWS, buildTodayPlan } from './todayPlan'

const ZONE = 'America/Chicago'
/** 28 Oct 2026, 10:45 in Chicago. */
const NOW = Date.UTC(2026, 9, 28, 15, 45)
const at = (hour: number, minute = 0) => Date.UTC(2026, 9, 28, hour + 5, minute)

const fixed = (id: string, hour: number, over: Partial<TimelineItem> = {}): TimelineItem => ({
  id,
  sortMs: at(hour),
  endMs: at(hour + 1),
  title: id,
  timeLabel: null,
  source: 'commitment',
  ...over,
})

const task = (over: Partial<Task>): Task => ({
  id: 't',
  title: 'Task',
  status: 'pending',
  ...over,
})
const titles = (items: readonly TimelineItem[]) => items.map((item) => item.title)

describe('buildTodayPlan', () => {
  it('merges fixed items and timed tasks into one list, in time order', () => {
    const plan = buildTodayPlan({
      fixed: [fixed('Meeting', 14)],
      tasks: [
        task({
          id: 'b',
          title: 'Booked',
          scheduled_start_time: new Date(at(13)).toISOString(),
        }),
        task({
          id: 'd',
          title: 'Dinner',
          description: '7 PM',
          due_date: new Date(at(9)).toISOString(),
        }),
      ],
      nowMs: NOW,
      timeZone: ZONE,
    })

    expect(titles(plan.rows)).toEqual(['Booked', 'Meeting', 'Dinner'])
    expect(plan.rows[2]).toMatchObject({ source: 'task', timeLabel: '7:00 PM' })
  })

  it('drops what has finished but counts it, and keeps all-day entries first', () => {
    const plan = buildTodayPlan({
      fixed: [fixed('Standup', 8), fixed('Birthday', 0, { allDay: true }), fixed('Lunch', 12)],
      tasks: [],
      nowMs: NOW,
      timeZone: ZONE,
    })

    expect(titles(plan.rows)).toEqual(['Birthday', 'Lunch'])
    expect(plan.total).toBe(3)
  })

  it('says when nothing is left even though the day had plans', () => {
    const plan = buildTodayPlan({
      fixed: [fixed('Standup', 8)],
      tasks: [],
      nowMs: NOW,
      timeZone: ZONE,
    })
    expect(plan.rows).toEqual([])
    expect(plan.total).toBe(1)
  })

  it('caps the rows and reports the rest', () => {
    const many = Array.from({ length: MAX_PLAN_ROWS + 2 }, (_, i) =>
      fixed(`m${String(i)}`, 12 + i),
    )
    const plan = buildTodayPlan({ fixed: many, tasks: [], nowMs: NOW, timeZone: ZONE })
    expect(plan.rows).toHaveLength(MAX_PLAN_ROWS)
    expect(plan.hidden).toBe(2)
  })
})
