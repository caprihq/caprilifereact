import type { CalendarEvent, Commitment, Task } from '@/types/entities'
import { buildTodayTimeline, formatTimeOfDay } from './timeline'

/** 2026-03-10T16:00:00Z — midday in New York, evening in UTC. */
const NOW = Date.UTC(2026, 2, 10, 16, 0, 0)
const UTC = { nowMs: NOW, timeZone: 'UTC' }

const iso = (hourUtc: number, minute = 0): string =>
  new Date(Date.UTC(2026, 2, 10, hourUtc, minute)).toISOString()

const commitment = (overrides: Partial<Commitment> = {}): Commitment => ({
  id: 'c1',
  title: 'Family dinner',
  start_time: iso(18),
  end_time: iso(19),
  ...overrides,
})

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Dentist',
  is_scheduled_event: true,
  scheduled_start_time: iso(14),
  ...overrides,
})

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Standup',
  start: iso(9),
  end: iso(9, 15),
  allDay: false,
  ...overrides,
})

const empty = { commitments: [], tasks: [], events: [] }

describe('formatTimeOfDay', () => {
  it('formats in the requested zone', () => {
    expect(formatTimeOfDay(iso(14), 'UTC')).toBe('2:00 PM')
    expect(formatTimeOfDay(iso(14), 'America/New_York')).toBe('10:00 AM')
  })

  it('returns null for missing or unreadable input', () => {
    expect(formatTimeOfDay(undefined, 'UTC')).toBeNull()
    expect(formatTimeOfDay('nonsense', 'UTC')).toBeNull()
  })

  it('falls back to device local for an invalid zone rather than throwing', () => {
    expect(formatTimeOfDay(iso(14), 'Not/AZone')).not.toBeNull()
  })
})

describe('buildTodayTimeline', () => {
  it('is empty when nothing is scheduled', () => {
    expect(buildTodayTimeline({ ...empty, ...UTC })).toEqual([])
  })

  it('orders every source by start time', () => {
    const timeline = buildTodayTimeline({
      commitments: [commitment()],
      tasks: [task()],
      events: [event()],
      ...UTC,
    })

    expect(timeline.map((item) => item.title)).toEqual(['Standup', 'Dentist', 'Family dinner'])
  })

  it('sorts calendar events into the right slot', () => {
    // The web read `e.start?.dateTime` on a flat string, so every event sorted
    // as an Invalid Date and landed arbitrarily. Guard against a regression.
    const timeline = buildTodayTimeline({
      commitments: [commitment({ start_time: iso(8), end_time: iso(9) })],
      tasks: [],
      events: [event({ start: iso(10), end: iso(11) })],
      ...UTC,
    })
    expect(timeline.map((item) => item.source)).toEqual(['commitment', 'calendar'])
    expect(timeline.every((item) => Number.isFinite(item.sortMs))).toBe(true)
  })

  it('labels a range, and collapses to the start when the end is unusable', () => {
    const [withEnd] = buildTodayTimeline({ ...empty, commitments: [commitment()], ...UTC })
    expect(withEnd?.timeLabel).toBe('6:00 PM – 7:00 PM')

    const [noEnd] = buildTodayTimeline({
      ...empty,
      commitments: [commitment({ end_time: 'nonsense' })],
      ...UTC,
    })
    expect(noEnd?.timeLabel).toBe('6:00 PM')
  })

  it('labels an all-day event as All day', () => {
    const [item] = buildTodayTimeline({ ...empty, events: [event({ allDay: true })], ...UTC })
    expect(item?.timeLabel).toBe('All day')
  })

  it('carries the location through, defaulting to null', () => {
    const [withPlace] = buildTodayTimeline({
      ...empty,
      events: [event({ location: 'Room 2' })],
      ...UTC,
    })
    expect(withPlace?.location).toBe('Room 2')

    const [withoutPlace] = buildTodayTimeline({ ...empty, events: [event()], ...UTC })
    expect(withoutPlace?.location).toBeNull()
  })

  it('gives ids that cannot collide across sources', () => {
    const timeline = buildTodayTimeline({
      commitments: [commitment({ id: 'shared' })],
      tasks: [task({ id: 'shared' })],
      events: [event({ id: 'shared' })],
      ...UTC,
    })
    expect(new Set(timeline.map((item) => item.id)).size).toBe(3)
  })

  describe('what counts as today', () => {
    it('excludes anything on another local date', () => {
      const tomorrow = new Date(Date.UTC(2026, 2, 12, 9)).toISOString()
      const timeline = buildTodayTimeline({
        ...empty,
        commitments: [commitment({ start_time: tomorrow, end_time: tomorrow })],
        ...UTC,
      })
      expect(timeline).toEqual([])
    })

    it('resolves the date in the user timezone, not the device one', () => {
      // 03:00 UTC on the 10th is still the 9th in New York.
      const earlyUtc = [event({ start: iso(3), end: iso(4) })]
      expect(buildTodayTimeline({ ...empty, events: earlyUtc, ...UTC })).toHaveLength(1)
      expect(
        buildTodayTimeline({
          ...empty,
          events: earlyUtc,
          nowMs: NOW,
          timeZone: 'America/New_York',
        }),
      ).toHaveLength(0)
    })
  })

  describe('scheduled-event tasks', () => {
    it('includes only tasks flagged as scheduled events', () => {
      const timeline = buildTodayTimeline({
        ...empty,
        tasks: [task(), task({ id: 't2', is_scheduled_event: false })],
        ...UTC,
      })
      expect(timeline).toHaveLength(1)
    })

    it('excludes completed ones', () => {
      const timeline = buildTodayTimeline({
        ...empty,
        tasks: [task({ status: 'completed' })],
        ...UTC,
      })
      expect(timeline).toEqual([])
    })

    it('falls back to due_date when there is no scheduled start', () => {
      const timeline = buildTodayTimeline({
        ...empty,
        tasks: [{ id: 't3', title: 'Call', is_scheduled_event: true, due_date: iso(11) }],
        ...UTC,
      })
      expect(timeline[0]?.timeLabel).toBe('11:00 AM')
    })

    it('drops one with no time anchor at all', () => {
      const timeline = buildTodayTimeline({
        ...empty,
        tasks: [{ id: 't4', title: 'Undated', is_scheduled_event: true }],
        ...UTC,
      })
      expect(timeline).toEqual([])
    })
  })
})

describe('imported calendar events', () => {
  /**
   * The backend copies meetings into commitments so the reminder sweep has
   * something to count down to. Without this the same meeting is listed twice:
   * once live from Google, once as its imported row.
   */
  const imported = commitment({
    id: 'c-import',
    title: 'Standup',
    start_time: iso(9),
    end_time: iso(9, 15),
    origin_source: 'google_calendar',
    external_event_id: 'e1',
  })

  it('shows an imported meeting once, not twice', () => {
    const items = buildTodayTimeline({
      ...empty,
      commitments: [imported],
      events: [event({ id: 'e1' })],
      ...UTC,
    })

    expect(items).toHaveLength(1)
    // The commitment wins: it is the row a reminder is attached to.
    expect(items[0]?.source).toBe('commitment')
  })

  it('still shows a meeting that has not been imported yet', () => {
    const items = buildTodayTimeline({
      ...empty,
      commitments: [imported],
      events: [event({ id: 'e1' }), event({ id: 'e2', title: 'Review', start: iso(11) })],
      ...UTC,
    })

    expect(items.map((item) => item.title)).toEqual(['Standup', 'Review'])
  })

  it('leaves manual commitments alone', () => {
    // A hand-made commitment has no external id and must never suppress an event.
    const items = buildTodayTimeline({
      ...empty,
      commitments: [commitment()],
      events: [event()],
      ...UTC,
    })

    expect(items).toHaveLength(2)
  })
})
