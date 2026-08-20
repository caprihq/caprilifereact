import { ACCENT_NAMES, accentColorFor, moodFor, themes } from './themes'
import { flatten, inkOn } from './moods'
import { palette } from './tokens'

/**
 * The accents are muted on purpose, and muted is one step from illegible — so the
 * contrast that makes them safe is asserted rather than eyeballed.
 *
 * They replaced Tailwind's 500/600 brights, which were display colours: fully
 * saturated, loud beside slate, and all five shouting equally.
 */

/** WCAG relative luminance. */
const luminance = (hex: string): number => {
  const channel = (pair: string): number => {
    const value = Number.parseInt(pair, 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const r = channel(hex.slice(1, 3))
  const g = channel(hex.slice(3, 5))
  const b = channel(hex.slice(5, 7))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}

describe('accent palette', () => {
  it('offers White plus six colours, each with a light and a dark tone', () => {
    expect(ACCENT_NAMES).toHaveLength(7)
    // White leads, because it is the default and the way back out of a colour.
    expect(ACCENT_NAMES[0]).toBe('plain')
    for (const accent of ACCENT_NAMES) {
      expect(accentColorFor(accent, 'light')).toMatch(/^#[0-9A-F]{6}$/i)
      expect(accentColorFor(accent, 'dark')).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('keeps the ink tone legible as text on the page, in both modes', () => {
    // 4.5:1 is WCAG AA for body text, and `accentInk` is what links, icons and the
    // active tab are painted with. The *fill* is deliberately exempt — it is never
    // text, which is the whole reason it gets to be bright.
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        const theme = themes[`${accent}-${mode}`]
        if (!theme) throw new Error(`theme ${accent}-${mode} is not registered`)
        expect(contrast(theme.colors.accentInk, theme.colors.background)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(theme.colors.accentInk, theme.colors.surface)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps the fills bright — brighter than any ink tone could be', () => {
    // The complaint that produced this split: a single accent had to be both fill and
    // text, and text on white caps luminance at ≈0.183, so every accent stayed dull.
    // A fill answers only to the ink on top of it, so it can go well past that.
    for (const accent of ACCENT_NAMES.filter((name) => name !== 'plain')) {
      const theme = themes[`${accent}-light`]
      if (!theme) throw new Error(`theme ${accent}-light is not registered`)
      expect(luminance(theme.colors.accent)).toBeGreaterThan(0.25)
      expect(luminance(theme.colors.accent)).toBeGreaterThan(luminance(theme.colors.accentInk))
    }
  })

  it('keeps every dark accent legible on the dark background', () => {
    for (const accent of ACCENT_NAMES) {
      // Against the theme's own background, not a hardcoded slate: dark mode was
      // lifted off near-black, and a stale reference would have hidden that.
      const theme = themes[`${accent}-dark`]
      if (!theme) throw new Error(`theme ${accent}-dark is not registered`)
      expect(contrast(theme.colors.accent, theme.colors.background)).toBeGreaterThanOrEqual(4.5)
      // And on a card, which sits a step above the background.
      expect(contrast(theme.colors.accent, theme.colors.surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps the accents bright — dull was the complaint that produced this set', () => {
    // 4.5:1 on white caps luminance at about 0.183, so "brighter" means sitting
    // just under that ceiling rather than halfway down it. The earthy set this
    // replaced ran from 0.077 (midnight) to 0.158 (sunset).
    for (const accent of ACCENT_NAMES.filter((name) => name !== 'plain')) {
      expect(luminance(accentColorFor(accent, 'light'))).toBeGreaterThan(0.16)
    }
  })

  it('puts readable ink on a filled surface, at rest and pressed', () => {
    // A fixed `textOnAccent` was white in both modes, which on a dark-mode accent is
    // about 2:1 — the FAB's "+" was invisible. It is now chosen per accent, and the
    // pressed fill is included because a press that hides the label is the same bug.
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        const theme = themes[`${accent}-${mode}`]
        if (!theme) throw new Error(`theme ${accent}-${mode} is not registered`)
        expect(contrast(theme.colors.accent, theme.colors.textOnAccent)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(theme.colors.accentPressed, theme.colors.textOnAccent)).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('gives each accent its own hue, so they are tellable apart', () => {
    const lights = ACCENT_NAMES.map((accent) => accentColorFor(accent, 'light'))
    expect(new Set(lights).size).toBe(lights.length)
  })

  it('stays vivid — this rule used to say the opposite', () => {
    // It asserted saturation *below* 0.8, from the period when the accents were
    // deliberately earthy so as not to compete with content. That was reported as
    // dull twice, so the requirement is inverted: the fills are colours now, and
    // legibility is protected by the contrast assertions above rather than by
    // keeping the hues weak. `plain` is exempt — White's fill is slate.
    for (const accent of ACCENT_NAMES.filter((name) => name !== 'plain')) {
      const hex = accentColorFor(accent, 'light')
      const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255)
      const max = Math.max(r ?? 0, g ?? 0, b ?? 0)
      const min = Math.min(r ?? 0, g ?? 0, b ?? 0)
      const saturation = max === 0 ? 0 : (max - min) / max
      expect(saturation).toBeGreaterThan(0.55)
    }
  })

  it('registers every theme Unistyles switches between', () => {
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        expect(themes[`${accent}-${mode}`]?.mode).toBe(mode)
      }
    }
  })
})

describe('moods', () => {
  it('names a feeling for every mood, in both modes', () => {
    // The point of the redesign: one choice should convey something, not just tint
    // an icon. The word appears under the swatch.
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        expect(moodFor(accent, mode).feeling.length).toBeGreaterThan(0)
      }
    }
  })

  it('spans the whole page in three stops, rather than fading out at the top', () => {
    // The first version resolved to plain white by mid-screen, which left the lower
    // half untinted and made the choice look like a header decoration.
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        expect(moodFor(accent, mode).wash).toHaveLength(3)
      }
    }
  })

  it('thins downwards, so the page has direction instead of a flat tint', () => {
    const opacity = (colour: string): number => Number.parseInt(colour.slice(7, 9), 16) / 255

    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        const [top = '', middle = '', bottom = ''] = moodFor(accent, mode).wash
        expect(opacity(top)).toBeGreaterThan(opacity(middle))
        expect(opacity(middle)).toBeGreaterThan(opacity(bottom))
      }
    }
  })

  it('keeps text off the wash by leaving card surfaces opaque', () => {
    // Legibility comes from content sitting on a solid surface, not from the wash
    // being invisible. An alpha channel on `surface` would undo that.
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        const theme = themes[`${accent}-${mode}`]
        if (!theme) throw new Error(`theme ${accent}-${mode} is not registered`)
        expect(theme.colors.surface).toMatch(/^#[0-9A-F]{6}$/i)
        expect(theme.colors.background).toMatch(/^#[0-9A-F]{6}$/i)
      }
    }
  })

  it('washes strongly enough for the moods to be different rooms', () => {
    // This used to assert the opposite — under 25% — and that faintness was exactly
    // the complaint: at 16% every mood is a pale grey-ish tint and only the hue
    // differs, which is nothing at that strength.
    for (const accent of ACCENT_NAMES.filter((name) => name !== 'plain')) {
      const [first = ''] = moodFor(accent, 'light').wash
      expect(Number.parseInt(first.slice(7, 9), 16) / 255).toBeGreaterThan(0.3)
    }
  })

  it('keeps secondary text legible on the strengthened wash', () => {
    // The limit on strength is not taste, it is this: section labels and captions sit
    // directly on the wash. slate-500 measured 4.3:1 on a 46% tint, which is why
    // light-mode secondary text moved to slate-600 when the wash got stronger.
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        const theme = themes[`${accent}-${mode}`]
        if (!theme) throw new Error(`theme ${accent}-${mode} is not registered`)
        const [top = ''] = theme.wash
        const page = flatten(top, theme.colors.background)
        expect(contrast(theme.colors.textSecondary, page)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(theme.colors.textPrimary, page)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('separates the moods, which is what "they all look the same" meant', () => {
    // Measured on the colours the pages actually resolve to, not on the accents in
    // the abstract: two moods can hold different hues and still paint near-identical
    // pages if the wash is weak, which is precisely what happened at 16%.
    //
    // The comparison is per stop rather than on an average, because a gradient is
    // experienced as a sweep. Aurora crosses cyan → orchid → rose, so its *average*
    // sits close to midnight's while the two are never confusable on screen; what
    // has to hold is that somewhere down the page they are plainly different.
    const stopsOf = (accent: (typeof ACCENT_NAMES)[number]): readonly string[] => {
      const theme = themes[`${accent}-light`]
      if (!theme) throw new Error(`theme ${accent}-light is not registered`)
      return theme.wash.map((stop) => flatten(stop, theme.colors.background))
    }

    const channelOf = (colour: string, at: number): number =>
      Number.parseInt(colour.slice(at, at + 2), 16)

    const colours = ACCENT_NAMES.filter((name) => name !== 'plain')
    for (const [index, accent] of colours.entries()) {
      for (const other of colours.slice(index + 1)) {
        const mine = stopsOf(accent)
        const theirs = stopsOf(other)
        const widest = Math.max(
          ...mine.map((stop, at) =>
            Math.max(
              ...[1, 3, 5].map((channel) =>
                Math.abs(channelOf(stop, channel) - channelOf(theirs[at] ?? stop, channel)),
              ),
            ),
          ),
        )

        expect(widest).toBeGreaterThanOrEqual(30)
      }
    }
  })

  it('paints swatches at full strength, unlike the wash', () => {
    // A 32pt circle filled with a 10%-alpha wash looks empty.
    for (const accent of ACCENT_NAMES) {
      for (const colour of moodFor(accent, 'light').swatch) {
        expect(colour).toMatch(/^#[0-9A-F]{6}$/i)
      }
    }
  })

  it('crosses three clearly different hues in Aurora, and only in Aurora', () => {
    const hue = (colour: string) => colour.slice(0, 7).toLowerCase()
    const apart = (a: string, b: string): number =>
      Math.max(
        ...[1, 3, 5].map((at) =>
          Math.abs(Number.parseInt(a.slice(at, at + 2), 16) - Number.parseInt(b.slice(at, at + 2), 16)),
        ),
      )

    const [first = '', second = '', third = ''] = moodFor('aurora', 'light').wash
    expect(new Set([first, second, third].map(hue)).size).toBe(3)
    // Sophisticated, but not vague: a rainbow whose colours are hard to tell apart
    // reads as a smudge, which is what the first version looked like.
    expect(apart(first, second)).toBeGreaterThanOrEqual(60)
    expect(apart(second, third)).toBeGreaterThanOrEqual(60)
    expect(moodFor('aurora', 'light').swatch.length).toBe(3)

    for (const accent of ACCENT_NAMES.filter((name) => name !== 'aurora')) {
      // One hue family — the fill and its ink — deepening as it falls.
      expect(new Set(moodFor(accent, 'light').wash.map(hue)).size).toBeLessThanOrEqual(2)
      expect(moodFor(accent, 'light').swatch).toHaveLength(1)
    }
  })

  it('tints fields more than cards, so an input reads as inset', () => {
    const opacity = (colour: string): number => Number.parseInt(colour.slice(7, 9), 16) / 255

    for (const accent of ACCENT_NAMES) {
      const mood = moodFor(accent, 'light')
      expect(opacity(mood.field)).toBeGreaterThan(opacity(mood.tint))
      expect(opacity(mood.fieldBorder)).toBeGreaterThan(opacity(mood.field))
    }
  })
})

describe('White', () => {
  /**
   * The plain page, as a choice rather than the absence of one. Before it there was
   * no way back to a white app once a colour had been picked, which is what made
   * picking one feel like a commitment.
   */

  it('leaves the page white, top and bottom', () => {
    const theme = themes['plain-light']
    if (!theme) throw new Error('plain-light is not registered')

    // The bottom of the wash is nothing at all, and the top is under two points off
    // white — present enough for the gradient to have direction, invisible as colour.
    expect(theme.colors.footerSurface.toLowerCase()).toBe(palette.white.toLowerCase())

    const distanceFromWhite = [1, 3, 5].map(
      (at) => 255 - Number.parseInt(theme.colors.headerSurface.slice(at, at + 2), 16),
    )
    for (const distance of distanceFromWhite) expect(distance).toBeLessThanOrEqual(10)
  })

  it('tints with neutral grey rather than a hue', () => {
    // Any colour in the wash would make "White" a lie.
    for (const mode of ['light', 'dark'] as const) {
      for (const stop of moodFor('plain', mode).wash) {
        const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) => Number.parseInt(stop.slice(at, at + 2), 16))
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(45)
      }
    }
  })

  it('still marks links and the primary action', () => {
    // A white page is not a colourless one: the accent falls back to slate, which is
    // what the product looked like before any of the moods existed.
    expect(contrast(accentColorFor('plain', 'light'), palette.white)).toBeGreaterThanOrEqual(7)
  })

  it('gives its swatch something to see', () => {
    // A white dot on a white card needs the row's hairline to exist at all; what is
    // asserted here is the other half — that the tick on it is not also white.
    const [dot = ''] = moodFor('plain', 'light').swatch
    expect(contrast(inkOn(dot), dot)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('chrome that has to meet the wash', () => {
  /**
   * The header and tab bar are platform views, so they cannot live inside the
   * gradient — they are painted the colours it starts and ends at instead. If that
   * arithmetic drifts, a seam appears at the top or bottom of every screen and the
   * full-page wash reads as a decorated panel again.
   */

  it('flattens the wash ends to opaque colours', () => {
    for (const accent of ACCENT_NAMES) {
      for (const mode of ['light', 'dark'] as const) {
        const { colors } = themes[`${accent}-${mode}`] ?? {}
        // Six digits, no alpha: a platform view must not be asked to composite.
        expect(colors?.headerSurface).toMatch(/^#[0-9a-f]{6}$/)
        expect(colors?.footerSurface).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('matches each end of the wash it abuts', () => {
    const flat = (over: string, base: string): string => {
      const a = Number.parseInt(over.slice(7, 9), 16) / 255
      const mix = (at: number): number =>
        Math.round(
          Number.parseInt(over.slice(at, at + 2), 16) * a +
            Number.parseInt(base.slice(at, at + 2), 16) * (1 - a),
        )
      return `#${[1, 3, 5].map((at) => mix(at).toString(16).padStart(2, '0')).join('')}`
    }

    for (const accent of ACCENT_NAMES) {
      const theme = themes[`${accent}-light`]
      const [first = '', , last = ''] = theme?.wash ?? []

      expect(theme?.colors.headerSurface).toBe(flat(first, palette.white))
      expect(theme?.colors.footerSurface).toBe(flat(last, palette.white))
    }
  })

  it('keeps the header lighter at the top than the bar at the bottom', () => {
    // The wash thins downwards, so the header must carry more colour than the bar.
    // Reversed, the gradient would appear to run the wrong way.
    const sum = (colour: string): number =>
      [1, 3, 5].reduce((total, at) => total + Number.parseInt(colour.slice(at, at + 2), 16), 0)

    for (const accent of ACCENT_NAMES) {
      const { colors } = themes[`${accent}-light`] ?? {}
      // More tint = further from white = a smaller channel sum in light mode.
      expect(sum(colors?.headerSurface ?? '')).toBeLessThan(sum(colors?.footerSurface ?? ''))
    }
  })
})
