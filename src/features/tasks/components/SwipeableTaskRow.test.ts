import { clampDrag, settleTarget } from './SwipeableTaskRow'

/**
 * The swipe rules, as pure functions.
 *
 * They moved out of a Reanimated worklet when that dependency was removed — it was
 * crashing the process inside `MountingCoordinator::pullTransaction` — and the
 * rewrite is the moment to pin the behaviour, because "which way does it open" is
 * exactly the sort of thing a rewrite inverts silently.
 */

describe('settleTarget', () => {
  it('opens when the swipe passes the threshold', () => {
    expect(settleTarget(0, -120)).toBe(-160)
  })

  it('snaps shut on a short swipe', () => {
    // A flick that never got going should leave the row alone, not half-open.
    expect(settleTarget(0, -40)).toBe(0)
  })

  it('closes an open row when swiped back', () => {
    expect(settleTarget(-160, 120)).toBe(0)
  })

  it('keeps an open row open when barely nudged', () => {
    expect(settleTarget(-160, 10)).toBe(-160)
  })

  it('ignores rightward swipes on a shut row', () => {
    // There is nothing to reveal on the right, so this must not open anything.
    expect(settleTarget(0, 200)).toBe(0)
  })
})

describe('clampDrag', () => {
  it('tracks the finger while inside the actions', () => {
    expect(clampDrag(0, -90)).toBe(-90)
  })

  it('never lets the row slide right of its resting place', () => {
    expect(clampDrag(0, 60)).toBe(0)
  })

  it('gives 20pt of rubber band past the actions and no more', () => {
    expect(clampDrag(0, -400)).toBe(-180)
  })

  it('continues from where an open row was left', () => {
    expect(clampDrag(-160, 40)).toBe(-120)
  })
})
