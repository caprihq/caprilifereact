import type { Task } from '@/types/entities'
import { scheduleChanged } from './scheduleChanged'

const task = { id: 't', title: 'T', status: 'pending', scheduled_start_time: '2026-10-27T14:00:00.000Z', estimated_minutes: 60 } as Task

describe('scheduleChanged', () => {
  it('is true when the start moves or the length changes', () => {
    expect(scheduleChanged(task, { title: 'T', scheduled_start_time: '2026-10-27T15:00:00.000Z', estimated_minutes: 60 })).toBe(true)
    expect(scheduleChanged(task, { title: 'T', scheduled_start_time: task.scheduled_start_time, estimated_minutes: 90 })).toBe(true)
  })

  it('is false for an edit that leaves the block alone', () => {
    expect(scheduleChanged(task, { title: 'Renamed', scheduled_start_time: task.scheduled_start_time, estimated_minutes: 60 })).toBe(false)
  })
})
