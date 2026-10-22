import type { TimelineItem } from '@/features/commitments'
import type { Task } from '@/types/entities'
import { buildUnifiedDay } from './unifiedDay'

const UTC = 'UTC'

const task = (id: string, start: string, overrides: Partial<Task> = {}): Task => ({
  id,
  title: id,
  status: 'pending',
  scheduled_start_time: start,
  ...overrides,
})

const fixed = (id: string, iso: string, overrides: Partial<TimelineItem> = {}): TimelineItem => ({
  id,
  sortMs: new Date(iso).getTime(),
  title: id,
  timeLabel: null,
  source: 'calendar',
  ...overrides,
})

const keysIn = (day: ReturnType<typeof buildUnifiedDay>, slot: string) =>
  day.blocks.find((block) => block.slot.key === slot)?.rows.map((row) => row.key)

describe('buildUnifiedDay', () => {
  it('puts tasks and commitments in the same block, in time order', () => {
    const day = buildUnifiedDay({
      tasks: [task('report', '2026-10-19T15:00:00Z'), task('email', '2026-10-19T13:00:00Z')],
      fixed: [fixed('calendar-standup', '2026-10-19T14:00:00Z')],
      timeZone: UTC,
    })

    expect(keysIn(day, 'afternoon')).toEqual(['task-email', 'calendar-standup', 'task-report'])
    expect(keysIn(day, 'morning')).toEqual([])
  })

  it('places by the hour where the user is, not in UTC', () => {
    // 01:00 UTC is 9pm the evening before in New York.
    const day = buildUnifiedDay({
      tasks: [],
      fixed: [fixed('calendar-dinner', '2026-10-20T01:00:00Z')],
      timeZone: 'America/New_York',
    })

    expect(keysIn(day, 'evening')).toEqual(['calendar-dinner'])
  })

  it('never shows a scheduled event twice', () => {
    // The event task comes through the timeline as a fixed item; the task list must
    // not draw it again as work.
    const event = task('dentist', '2026-10-19T10:00:00Z', { is_scheduled_event: true })
    const day = buildUnifiedDay({
      tasks: [event],
      fixed: [fixed('task-dentist', '2026-10-19T10:00:00Z', { source: 'task', task: event })],
      timeZone: UTC,
    })

    expect(keysIn(day, 'morning')).toEqual(['task-dentist'])
    expect(day.blocks[0]?.rows[0]?.kind).toBe('fixed')
  })

  it('keeps whole-day entries out of the morning', () => {
    const day = buildUnifiedDay({
      tasks: [],
      fixed: [fixed('calendar-birthday', '2026-10-19T00:00:00Z', { allDay: true })],
      timeZone: UTC,
    })

    expect(keysIn(day, 'morning')).toEqual([])
    expect(day.allDay.map((item) => item.id)).toEqual(['calendar-birthday'])
  })

  it('shows a meeting before a task booked for the same minute', () => {
    const day = buildUnifiedDay({
      tasks: [task('prep', '2026-10-19T09:00:00Z')],
      fixed: [fixed('commitment-call', '2026-10-19T09:00:00Z', { source: 'commitment' })],
      timeZone: UTC,
    })

    expect(keysIn(day, 'morning')).toEqual(['commitment-call', 'task-prep'])
  })
})
