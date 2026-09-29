import { isAppFocused } from './appFocus'

/**
 * The distinction this file exists for: `inactive` is a transition, not a
 * background. Treating it as unfocused turns every permission sheet, app-switcher
 * glance and incoming call into a focus change — and each focus change refetches
 * every stale query.
 */
describe('isAppFocused', () => {
  it('is focused only when the app is genuinely active', () => {
    expect(isAppFocused('active')).toBe(true)
  })

  it('is not focused in the background', () => {
    expect(isAppFocused('background')).toBe(false)
  })

  it('does not count a mid-transition state as focused', () => {
    // Deliberate: `inactive` arrives and leaves in pairs, so counting it would
    // double the refetches for no new data.
    expect(isAppFocused('inactive')).toBe(false)
  })

  it('treats states it does not know as unfocused', () => {
    // Android reports `unknown` at cold start, and tvOS adds `extension`.
    expect(isAppFocused('unknown')).toBe(false)
    expect(isAppFocused('extension')).toBe(false)
  })
})
