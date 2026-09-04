import { bandForScore, clampScore } from './priorityBand'

/**
 * The score-to-band contract the prompt states and the parser then enforces.
 *
 * Enforced rather than trusted because a model that answers `priority: "low"` with a
 * score of 90 would put a low task at the top of a list that sorts by band and then
 * score — which reads as a broken ranking, not a debatable judgement.
 */
describe('bandForScore', () => {
  it('maps each range to the label the web client documents', () => {
    expect(bandForScore(100)).toBe('critical')
    expect(bandForScore(75)).toBe('critical')
    expect(bandForScore(74)).toBe('high')
    expect(bandForScore(50)).toBe('high')
    expect(bandForScore(49)).toBe('medium')
    expect(bandForScore(25)).toBe('medium')
    expect(bandForScore(24)).toBe('low')
    expect(bandForScore(0)).toBe('low')
  })

  it('holds at every boundary, which is where an off-by-one would hide', () => {
    for (const [score, band] of [
      [26, 'medium'],
      [51, 'high'],
      [76, 'critical'],
    ] as const) {
      expect(bandForScore(score)).toBe(band)
    }
  })
})

describe('clampScore', () => {
  it('keeps a score inside 0-100, because the model sometimes does not', () => {
    expect(clampScore(120)).toBe(100)
    expect(clampScore(-5)).toBe(0)
    expect(clampScore(63.4)).toBe(63)
  })
})
