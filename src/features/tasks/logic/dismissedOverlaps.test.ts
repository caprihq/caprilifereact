import { parseDismissed, withDismissed } from './dismissedOverlaps'

describe('dismissed overlaps', () => {
  it('round-trips what was stored', () => {
    const stored = JSON.stringify(withDismissed(new Set(['a']), 'b'))
    expect([...parseDismissed(stored)]).toEqual(['a', 'b'])
  })

  it('treats missing or corrupt storage as nothing dismissed', () => {
    expect(parseDismissed(undefined).size).toBe(0)
    expect(parseDismissed('{not json').size).toBe(0)
    expect(parseDismissed('{"a":1}').size).toBe(0)
  })

  it('keeps the newest 200, without duplicates', () => {
    const many = new Set(Array.from({ length: 200 }, (_, i) => `k${String(i)}`))
    const next = withDismissed(many, 'k0')
    expect(next).toHaveLength(200)
    expect(next[next.length - 1]).toBe('k0')
    expect(withDismissed(many, 'new')).not.toContain('k0')
  })
})
