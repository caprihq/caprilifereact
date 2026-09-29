import { buildWidgetSnapshot, sameWidgetContent } from './widgetSnapshot'
import { WIDGET_SNAPSHOT_SCHEMA } from '../../../../modules/capri-app-group/constants'
import type { Task } from '@/types/entities'

const NOW = Date.parse('2026-09-08T09:00:00.000Z')

const task = (over: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Dinner',
  status: 'pending',
  ...over,
})

describe('buildWidgetSnapshot', () => {
  it('publishes the hero the app is showing, not its own ranking', () => {
    // The whole point: the widget must not disagree with Home about what to start.
    const snapshot = buildWidgetSnapshot({
      hero: task({ id: 'hero', title: 'Call the bank', priority: 'critical' }),
      upNext: [task({ id: 'a' }), task({ id: 'b' })],
      nowMs: NOW,
    })

    expect(snapshot.hero?.id).toBe('hero')
    expect(snapshot.upNext.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('stamps the schema so the widget can refuse a shape it cannot read', () => {
    expect(buildWidgetSnapshot({ hero: null, upNext: [], nowMs: NOW }).schema).toBe(
      WIDGET_SNAPSHOT_SCHEMA,
    )
  })

  it('stamps when it was published, so the widget knows when to distrust it', () => {
    expect(buildWidgetSnapshot({ hero: null, upNext: [], nowMs: NOW }).publishedAt).toBe(
      '2026-09-08T09:00:00.000Z',
    )
  })

  it('carries the due date so the widget can re-derive overdue at midnight', () => {
    const snapshot = buildWidgetSnapshot({
      hero: task({ due_date: '2026-09-07T12:00:00.000Z' }),
      upNext: [],
      nowMs: NOW,
    })

    expect(snapshot.hero?.due).toBe('2026-09-07T12:00:00.000Z')
  })

  it('carries nothing beyond what the widget draws', () => {
    // This store is unencrypted. Notes, tokens and subtasks have no business here.
    const snapshot = buildWidgetSnapshot({
      hero: task({ description: 'private notes', priority_reason: 'because' }),
      upNext: [],
      nowMs: NOW,
    })

    expect(Object.keys(snapshot.hero ?? {}).sort()).toEqual([
      'due',
      'id',
      'minutes',
      'priority',
      'title',
    ])
  })

  it('defaults a missing priority rather than publishing undefined', () => {
    expect(buildWidgetSnapshot({ hero: task(), upNext: [], nowMs: NOW }).hero?.priority).toBe(
      'medium',
    )
  })

  it('keeps three, which is all the medium widget has room for', () => {
    const snapshot = buildWidgetSnapshot({
      hero: task(),
      upNext: [task({ id: 'a' }), task({ id: 'b' }), task({ id: 'c' }), task({ id: 'd' })],
      nowMs: NOW,
    })

    expect(snapshot.upNext).toHaveLength(3)
  })

  it('reports an empty list rather than nothing at all', () => {
    const snapshot = buildWidgetSnapshot({ hero: null, upNext: [], nowMs: NOW })

    expect(snapshot.hero).toBeNull()
    expect(snapshot.upNext).toEqual([])
  })
})

describe('sameWidgetContent', () => {
  it('ignores the timestamp, so a ticking clock does not rewrite the store', () => {
    const a = buildWidgetSnapshot({ hero: task(), upNext: [], nowMs: NOW })
    const b = buildWidgetSnapshot({ hero: task(), upNext: [], nowMs: NOW + 60_000 })

    expect(sameWidgetContent(a, b)).toBe(true)
  })

  it('notices a different hero', () => {
    const a = buildWidgetSnapshot({ hero: task({ id: 'one' }), upNext: [], nowMs: NOW })
    const b = buildWidgetSnapshot({ hero: task({ id: 'two' }), upNext: [], nowMs: NOW })

    expect(sameWidgetContent(a, b)).toBe(false)
  })

  it('notices a renamed task', () => {
    const a = buildWidgetSnapshot({ hero: task({ title: 'Before' }), upNext: [], nowMs: NOW })
    const b = buildWidgetSnapshot({ hero: task({ title: 'After' }), upNext: [], nowMs: NOW })

    expect(sameWidgetContent(a, b)).toBe(false)
  })
})

describe('buildWidgetSnapshot — moreCount', () => {
  const task = (id: string): Task => ({ id, title: id, status: 'pending' })

  it('counts the open tasks it is not sending', () => {
    // Ten open, four shown: the widget has to be able to say "+6 more" rather than
    // presenting four as the whole list.
    const snapshot = buildWidgetSnapshot({
      hero: task('a'),
      upNext: [task('b'), task('c'), task('d')],
      nowMs: 0,
      totalOpen: 10,
    })

    expect(snapshot.moreCount).toBe(6)
  })

  it('is zero when everything open is on the widget', () => {
    const snapshot = buildWidgetSnapshot({
      hero: task('a'),
      upNext: [task('b')],
      nowMs: 0,
      totalOpen: 2,
    })

    expect(snapshot.moreCount).toBe(0)
  })

  it('never goes negative when the total lags behind the queue', () => {
    // The two are computed in the same pass, but a stale total must not produce
    // "+-2 more" on someone's home screen.
    const snapshot = buildWidgetSnapshot({
      hero: task('a'),
      upNext: [task('b'), task('c')],
      nowMs: 0,
      totalOpen: 1,
    })

    expect(snapshot.moreCount).toBe(0)
  })

  it('claims nothing more when no total is given', () => {
    const snapshot = buildWidgetSnapshot({ hero: task('a'), upNext: [task('b')], nowMs: 0 })

    expect(snapshot.moreCount).toBe(0)
  })

  it('republishes when only the count changed', () => {
    // "+2 more" becoming "+1 more" is a visible change, so it must not be treated as
    // identical content and skipped.
    const base = { hero: task('a'), upNext: [task('b')], nowMs: 0 }

    expect(
      sameWidgetContent(
        buildWidgetSnapshot({ ...base, totalOpen: 5 }),
        buildWidgetSnapshot({ ...base, totalOpen: 4 }),
      ),
    ).toBe(false)
  })
})
