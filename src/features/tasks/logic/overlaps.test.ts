import type { Task } from '@/types/entities'
import { findOverlaps, overlapKey, overlapLabel, taskSpan } from './overlaps'
import type { Span } from './overlaps'

const at = (hour: number, minute = 0) => Date.UTC(2026, 9, 26, hour, minute)
const iso = (ms: number) => new Date(ms).toISOString()

const task = (id: string, start: number, extra: Partial<Task> & { minutes?: number } = {}): Task => {
  const { minutes = 60, ...rest } = extra
  return {
    id,
    title: id,
    status: 'pending',
    scheduled_start_time: iso(start),
    scheduled_end_time: iso(start + minutes * 60_000),
    ...rest,
  }
}

const meeting = (title: string, start: number, end: number): Span => ({ key: `m-${title}`, title, start, end })
const none = new Set<string>()

describe('findOverlaps', () => {
  it('warns when a planned task sits on top of a meeting', () => {
    const found = findOverlaps({
      tasks: [task('report', at(14))],
      fixed: [meeting('Team meeting', at(14, 30), at(15, 30))],
      dismissed: none,
    })
    expect(found).toHaveLength(1)
    expect(found[0]?.task.id).toBe('report')
    expect(found[0]?.with.title).toBe('Team meeting')
  })

  it('stays quiet when the task ends exactly as the meeting starts', () => {
    const found = findOverlaps({
      tasks: [task('report', at(13), { minutes: 60 })],
      fixed: [meeting('Team meeting', at(14), at(15))],
      dismissed: none,
    })
    expect(found).toHaveLength(0)
  })

  it('reports two clashing tasks once, on the later one', () => {
    const found = findOverlaps({ tasks: [task('b', at(9, 30)), task('a', at(9))], fixed: [], dismissed: none })
    expect(found.map((o) => o.task.id)).toEqual(['b'])
    expect(found[0]?.with.title).toBe('a')
  })

  it('prefers the meeting over another task when both clash', () => {
    const found = findOverlaps({
      tasks: [task('a', at(9)), task('b', at(9, 15))],
      fixed: [meeting('Standup', at(9, 15), at(9, 45))],
      dismissed: none,
    })
    expect(found.find((o) => o.task.id === 'b')?.with.title).toBe('Standup')
  })

  it('ignores done, cancelled, saved-for-later and unscheduled tasks', () => {
    const fixed = [meeting('Call', at(10), at(11))]
    const tasks = [
      task('done', at(10), { status: 'completed' }),
      task('gone', at(10), { status: 'canceled' }),
      task('later', at(10), { status: 'saved_for_later' }),
      { id: 'loose', title: 'loose', status: 'pending' } as Task,
    ]
    expect(findOverlaps({ tasks, fixed, dismissed: none })).toHaveLength(0)
  })

  it('drops a clash the user chose to keep, until either time changes', () => {
    const report = task('report', at(14))
    const call = meeting('Call', at(14), at(15))
    const key = overlapKey(taskSpan(report)!, call)

    expect(findOverlaps({ tasks: [report], fixed: [call], dismissed: new Set([key]) })).toHaveLength(0)
    // Moved by half an hour: a new clash, so it warns again.
    const moved = task('report', at(14, 30))
    expect(findOverlaps({ tasks: [moved], fixed: [call], dismissed: new Set([key]) })).toHaveLength(1)
  })

  it('gives a task with no end its estimate, or 30 minutes', () => {
    const noEnd = { id: 'x', title: 'x', status: 'pending', scheduled_start_time: iso(at(8)), estimated_minutes: 90 } as Task
    expect(taskSpan(noEnd)?.end).toBe(at(9, 30))
    const noLength = { id: 'y', title: 'y', status: 'pending', scheduled_start_time: iso(at(8)) } as Task
    expect(taskSpan(noLength)?.end).toBe(at(8, 30))
  })
})

describe('overlapLabel', () => {
  it('names what it clashes with and when', () => {
    const [overlap] = findOverlaps({
      tasks: [task('report', at(14))],
      fixed: [meeting('Team meeting', at(14), at(15))],
      dismissed: none,
    })
    expect(overlapLabel(overlap!, 'UTC')).toBe('Overlaps Team meeting · 2:00 PM – 3:00 PM')
  })
})
