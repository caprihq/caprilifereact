import { buildContextSummary, loadLevelFor } from './userContext'
import type { ContextInput } from './userContext'
import type { CalendarEvent, Commitment, FocusTime, User } from '@/types/entities'

const NOW = Date.parse('2026-09-03T15:00:00Z')

const input = (overrides: Partial<ContextInput> = {}): ContextInput => ({
  user: undefined,
  focusTimes: [],
  commitments: [],
  calendarEvents: [],
  nowMs: NOW,
  timeZone: 'UTC',
  ...overrides,
})

const commitment = (start: string, end: string, title = 'Standup'): Commitment => ({
  id: Math.random().toString(),
  title,
  start_time: start,
  end_time: end,
})

const event = (start: string, end: string, allDay = false): CalendarEvent => ({
  id: Math.random().toString(),
  title: 'Review',
  start,
  end,
  allDay,
})

describe('loadLevelFor', () => {
  it('describes capacity rather than a minute count', () => {
    // The model has no scale for "312 minutes"; it does have one for "heavy".
    expect(loadLevelFor(0)).toBe('free (no commitments today)')
    expect(loadLevelFor(60)).toBe('light (under 2.5 hours committed)')
    expect(loadLevelFor(150)).toBe('moderate (2.5-5 hours committed)')
    expect(loadLevelFor(300)).toBe('heavy (5+ hours committed)')
  })

  it('holds at the thresholds, where an off-by-one would hide', () => {
    expect(loadLevelFor(149)).toBe('light (under 2.5 hours committed)')
    expect(loadLevelFor(299)).toBe('moderate (2.5-5 hours committed)')
  })
})

describe('buildContextSummary', () => {
  it('describes an unconfigured user without inventing preferences', () => {
    const summary = buildContextSummary(input())

    expect(summary).toContain('Work Hours: Not set')
    expect(summary).toContain('Peak Energy Hours: Not specified')
    expect(summary).toContain('None configured')
    expect(summary).toContain('- No commitments or calendar events today')
  })

  it('states the preferences that shape a plan', () => {
    const user = {
      id: 'u1',
      email: 'a@b.c',
      timezone: 'Europe/London',
      work_hours_start: '09:00',
      work_hours_end: '17:00',
      energy_peak_hours: [8, 9, 10],
      preferred_task_duration: 'quick',
      context_switch_tolerance: 'low',
    } as User

    const summary = buildContextSummary(input({ user }))

    expect(summary).toContain('Work Hours: 09:00 - 17:00')
    expect(summary).toContain('Peak Energy Hours: 8, 9, 10:00')
    expect(summary).toContain('Preferred Task Duration: quick')
    expect(summary).toContain('Context Switch Tolerance: low')
  })

  it('sums today\'s commitments and calendar events into one load figure', () => {
    // Two hours of commitments plus one of calendar: three hours, so a moderate day.
    const summary = buildContextSummary(
      input({
        commitments: [commitment('2026-09-03T09:00:00Z', '2026-09-03T11:00:00Z')],
        calendarEvents: [event('2026-09-03T13:00:00Z', '2026-09-03T14:00:00Z')],
      }),
    )

    expect(summary).toContain('Total committed time: 180 minutes')
    expect(summary).toContain('moderate (2.5-5 hours committed)')
    expect(summary).toContain('Standup')
    expect(summary).toContain('Review')
  })

  it('ignores anything that is not today, in the user zone', () => {
    // A commitment tomorrow must not count against today's capacity.
    const summary = buildContextSummary(
      input({ commitments: [commitment('2026-09-04T09:00:00Z', '2026-09-04T11:00:00Z')] }),
    )

    expect(summary).toContain('Total committed time: 0 minutes')
    expect(summary).toContain('free (no commitments today)')
  })

  it('excludes all-day events from committed time', () => {
    // An all-day event carries no start and end, so counting it would invent hours.
    const summary = buildContextSummary(
      input({ calendarEvents: [event('2026-09-03', '2026-09-04', true)] }),
    )

    expect(summary).toContain('Total committed time: 0 minutes')
  })

  it('lists focus blocks with their days named', () => {
    const block: FocusTime = {
      id: 'f1',
      label: 'Deep work',
      start_time: '09:00',
      end_time: '11:00',
      days: [1, 3, 5],
      priority_level: 'deep_focus',
      energy_level: 'high',
    }

    expect(buildContextSummary(input({ focusTimes: [block] }))).toContain(
      'Deep work (Mon, Wed, Fri 09:00-11:00, deep_focus, high energy)',
    )
  })
})
