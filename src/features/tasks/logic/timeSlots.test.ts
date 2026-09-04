import {
  DEFAULT_DURATION_MINUTES,
  TIME_SLOTS,
  localHourOf,
  slotForHour,
  schedulableTasks,
  slotKeyFor,
  windowForSlot,
} from './timeSlots'
import type { Task } from '@/types/entities'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Task',
  status: 'pending',
  ...overrides,
})

/** 2026-03-10T12:00:00Z — midday UTC, so zones on both sides of it differ by date. */
const NOW = Date.parse('2026-03-10T12:00:00Z')

describe('slotForHour', () => {
  it('splits the day where the web client splits it', () => {
    expect(slotForHour(0)).toBe('morning')
    expect(slotForHour(11)).toBe('morning')
    expect(slotForHour(12)).toBe('afternoon')
    expect(slotForHour(17)).toBe('afternoon')
    expect(slotForHour(18)).toBe('evening')
    expect(slotForHour(23)).toBe('evening')
  })
})

describe('slotKeyFor', () => {
  it('reads the hour in the user zone, not the device zone', () => {
    // 14:00 UTC is the afternoon in London and the evening in Tokyo. The web client
    // uses the device clock here, so a traveller sees their day rearranged.
    const scheduled = task({ scheduled_start_time: '2026-03-10T14:00:00Z' })

    expect(slotKeyFor(scheduled, 'Europe/London')).toBe('afternoon')
    expect(slotKeyFor(scheduled, 'Asia/Tokyo')).toBe('evening')
  })

  it('falls back to the due date when nothing is scheduled', () => {
    expect(slotKeyFor(task({ due_date: '2026-03-10T09:00:00Z' }), 'UTC')).toBe('morning')
  })

  it('prefers the scheduled time over the due date', () => {
    const both = task({
      scheduled_start_time: '2026-03-10T19:00:00Z',
      due_date: '2026-03-10T09:00:00Z',
    })
    expect(slotKeyFor(both, 'UTC')).toBe('evening')
  })

  it('returns null for a task with no anchor, and for a broken date', () => {
    expect(slotKeyFor(task(), 'UTC')).toBeNull()
    expect(slotKeyFor(task({ due_date: 'not-a-date' }), 'UTC')).toBeNull()
  })
})

describe('windowForSlot', () => {
  it('writes all three fields, because views read different ones', () => {
    // Writing only the scheduled pair leaves the task missing from anything that
    // filters on due_date, and vice versa.
    const window = windowForSlot(task({ estimated_minutes: 45 }), 'afternoon', { nowMs: NOW, timeZone: 'UTC' })

    expect(localHourOf(window.scheduled_start_time, 'UTC')).toBe(13)
    expect(window.due_date).toBe(window.scheduled_start_time)
    expect(
      (Date.parse(window.scheduled_end_time) - Date.parse(window.scheduled_start_time)) / 60_000,
    ).toBe(45)
  })

  it('gives a task with no estimate the default length', () => {
    const window = windowForSlot(task(), 'morning', { nowMs: NOW, timeZone: 'UTC' })
    expect(
      (Date.parse(window.scheduled_end_time) - Date.parse(window.scheduled_start_time)) / 60_000,
    ).toBe(DEFAULT_DURATION_MINUTES)
  })

  it('lands on today, and in the slot it was dropped into', () => {
    for (const slot of TIME_SLOTS) {
      const window = windowForSlot(task(), slot.key, { nowMs: NOW, timeZone: 'UTC' })

      expect(window.scheduled_start_time.slice(0, 10)).toBe('2026-03-10')
      // The round trip has to be stable: dropping a task into a slot and reading
      // its slot back must agree, or it jumps sections the moment it is placed.
      expect(slotKeyFor(task(window), 'UTC')).toBe(slot.key)
    }
  })

  it('means the hour where the user is, not where the phone is', () => {
    // The failing version used `setHours`, which is device-local. Under this test
    // machine's zone that put a 9am morning task at 14:00 UTC — evening in Tokyo,
    // so the task vanished from the block the user had just dropped it into.
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Europe/London']) {
      const window = windowForSlot(task(), 'morning', { nowMs: NOW, timeZone: zone })

      expect(localHourOf(window.scheduled_start_time, zone)).toBe(9)
      expect(slotKeyFor(task(window), zone)).toBe('morning')
    }
  })
})

describe('schedulableTasks', () => {
  const when = { nowMs: NOW, timeZone: 'UTC' }

  it('offers unscheduled and future work', () => {
    const backlog = task({ id: 'backlog' })
    const nextWeek = task({ id: 'nextWeek', due_date: '2026-03-17T09:00:00Z' })

    const ids = schedulableTasks([backlog, nextWeek], when).map((entry) => entry.id)
    expect(ids).toEqual(['backlog', 'nextWeek'])
  })

  it('hides what is already on today, in either field', () => {
    // Offering these would move a task between blocks rather than schedule it, which
    // reads as the picker duplicating work.
    const scheduledToday = task({ id: 'scheduled', scheduled_start_time: '2026-03-10T09:00:00Z' })
    const dueToday = task({ id: 'due', due_date: '2026-03-10T22:00:00Z' })

    expect(schedulableTasks([scheduledToday, dueToday], when)).toEqual([])
  })

  it('hides finished work and calendar events', () => {
    // A calendar event's time belongs to the calendar, not to CAPRI.
    const done = task({ id: 'done', status: 'completed' })
    const dropped = task({ id: 'dropped', status: 'canceled' })
    const event = task({ id: 'event', is_scheduled_event: true })

    expect(schedulableTasks([done, dropped, event], when)).toEqual([])
  })

  it('respects the user zone when deciding what "today" means', () => {
    // 2026-03-10T23:00Z is still the 10th in UTC but already the 11th in Tokyo, so
    // Tokyo may schedule it and UTC may not.
    const lateTonight = task({ id: 'late', due_date: '2026-03-10T23:00:00Z' })

    expect(schedulableTasks([lateTonight], when)).toEqual([])
    expect(
      schedulableTasks([lateTonight], { nowMs: NOW, timeZone: 'Asia/Tokyo' }).map((e) => e.id),
    ).toEqual(['late'])
  })
})
