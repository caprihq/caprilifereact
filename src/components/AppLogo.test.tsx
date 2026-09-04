import { LOGO_ASPECT_RATIO, wordmarkFor } from './AppLogo'

/**
 * The client's requirement: the logo is *different artwork* in light and dark, not
 * the same file recoloured.
 *
 * Asserted as a pure mapping rather than through a render. RTL v14 has been
 * unreliable in this repo for anything past a first mount, and the rule worth
 * protecting here is which file each mode resolves to — not that an `<Image>`
 * appears.
 */

describe('wordmarkFor', () => {
  it('resolves a different asset in each mode', () => {
    // The tempting simplification is one file plus `tintColor`: identical in a
    // screenshot of a one-colour wordmark, wrong the moment the mark gains a second.
    expect(wordmarkFor('light')).not.toBe(wordmarkFor('dark'))
  })

  it('resolves something in both modes', () => {
    // A missing asset resolves to undefined and renders as empty space, which reads
    // as a layout bug rather than a missing file.
    expect(wordmarkFor('light')).toBeDefined()
    expect(wordmarkFor('dark')).toBeDefined()
  })
})

describe('LOGO_ASPECT_RATIO', () => {
  it('matches the artwork, so a height never stretches it', () => {
    // Both files are 663×157. If the art is replaced at a different ratio and this
    // is not updated, the wordmark distorts at every call site.
    expect(LOGO_ASPECT_RATIO).toBeCloseTo(663 / 157, 5)
  })
})
