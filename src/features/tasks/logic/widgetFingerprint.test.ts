import type { Task } from '@/types/entities'
import { openTaskFingerprint } from './widgetFingerprint'

const task = (over: Partial<Task>): Task =>
  ({ id: 'a', title: 'Write report', status: 'pending', priority: 'high', ...over })

describe('openTaskFingerprint', () => {
  it('ignores order — reordering is the app\'s call, not a change', () => {
    const a = task({ id: 'a' })
    const b = task({ id: 'b', title: 'Call bank' })
    expect(openTaskFingerprint([a, b])).toBe(openTaskFingerprint([b, a]))
  })

  it('changes when a task is added, retitled, reprioritised or started', () => {
    const base = openTaskFingerprint([task({})])
    expect(openTaskFingerprint([task({}), task({ id: 'b' })])).not.toBe(base)
    expect(openTaskFingerprint([task({ title: 'Other' })])).not.toBe(base)
    expect(openTaskFingerprint([task({ priority: 'low' })])).not.toBe(base)
    expect(openTaskFingerprint([task({ status: 'in_progress' })])).not.toBe(base)
  })

  it('drops done, saved-for-later and scheduled events, as the widget does', () => {
    const base = openTaskFingerprint([task({})])
    expect(openTaskFingerprint([task({}), task({ id: 'x', status: 'completed' })])).toBe(base)
    expect(openTaskFingerprint([task({}), task({ id: 'y', status: 'saved_for_later' })])).toBe(base)
    expect(openTaskFingerprint([task({}), task({ id: 'z', is_scheduled_event: true })])).toBe(base)
  })

  it('ignores due date and duration, which the two sides format differently', () => {
    expect(openTaskFingerprint([task({ due_date: '2026-10-08T00:00:00Z' })])).toBe(
      openTaskFingerprint([task({ due_date: '2026-10-08T00:00:00.000Z', estimated_minutes: 30 })]),
    )
  })

  it('pins the exact output — the backend copy must produce the same', () => {
    // If this changes, update openTaskFingerprint in sendPushNotification/entry.ts too.
    expect(openTaskFingerprint([])).toBe('811c9dc5')
    expect(
      openTaskFingerprint([
        task({ id: 't1', title: 'Write report', status: 'pending', priority: 'high' }),
        task({ id: 't2', title: 'Call bank', status: 'in_progress', priority: 'medium' }),
      ]),
    ).toBe('9ef1feb6')
  })
})
