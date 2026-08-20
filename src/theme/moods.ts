import { palette } from './tokens'

/**
 * Accents as **moods**, not just hues.
 *
 * The old model gave each accent one colour, which is why picking one changed
 * little more than a few icons: a single hex can tint a glyph, but it cannot make a
 * screen feel cool, or warm, or calm. A mood carries the whole set instead — a
 * bright fill, an ink tone in the same hue, a page wash, a card wash, an input
 * surface and a selection glow — so one choice changes the temperature of the app.
 *
 * **Restraint was tried and rejected.** The first version kept the page essentially
 * white, washing at a few percent, on the theory that a tinted background is the
 * crude version of the idea. At that strength every mood is a pale grey-ish tint,
 * hue is the only thing separating them, and users reported — twice — that the
 * colours all looked the same. The washes now open near 40%, and the limit is
 * measured rather than tasteful: each hue is set close to the strength at which
 * secondary text stops clearing AA against it, which is why they differ per mood.
 * Text stays legible because it sits on opaque cards, and because light-mode
 * secondary text moved a step darker when the wash got stronger.
 *
 * Gradients use RN 0.86's native `experimental_backgroundImage`, so there is no
 * gradient library and no native rebuild — Fabric draws them.
 */

export type Mood = {
  /** One word for what this is meant to feel like. Shown under the swatch. */
  readonly feeling: string
  /**
   * The **fill**: buttons, the FAB, a selected chip. Bright, and paired with dark
   * ink rather than white, which is what allows it to be bright at all.
   */
  readonly accent: string
  /**
   * The same hue as **ink**: link text, icons, a focused border, the active tab.
   *
   * A separate tone because ink on the page has to clear 4.5:1 against it, and a
   * colour that does will never look vivid. Keeping them apart is what let the
   * fills get bright without making the text illegible.
   */
  readonly accentInk: string
  /** Pressed fill. A darkening of the fill, so the same ink still reads on it. */
  readonly accentPressed: string
  /**
   * Wash painted behind the **whole page**, top to bottom.
   *
   * Three stops, not two: the first version faded to white by mid-screen, which
   * left the lower half plain and made the choice feel like a header decoration.
   * Now the tint spans the page and simply thins as it falls, so the colour is
   * present everywhere without ever being the surface text sits on — cards stay
   * white, and that contrast is what keeps it legible.
   */
  readonly wash: readonly [string, string, string]
  /**
   * A card's own gradient, painted over the opaque surface.
   *
   * Two stops, from a hint of the mood down to nothing, so a card *catches* the
   * colour of the page instead of sitting on it as a white rectangle. This is the
   * difference between a card that belongs to a themed screen and one that has been
   * pasted onto it.
   */
  readonly card: readonly [string, string]
  /** Chip and inset fill, so a surface belongs to the mood without shouting. */
  readonly tint: string
  /** Input fill: a touch stronger than `tint`, so a field reads as inset. */
  readonly field: string
  /** Input border at rest. Focus uses the accent itself. */
  readonly fieldBorder: string
  /** Selection halo — the one place the colour is allowed to be obvious. */
  readonly glow: string
  /**
   * Full-strength colours for the picker's swatch.
   *
   * Separate from `wash` because a wash is a few percent alpha — painting a 32pt
   * circle with it would look empty. One entry means a solid dot; more means a
   * gradient, which is how Aurora shows what it is.
   */
  readonly swatch: readonly string[]
}

/**
 * `rrggbbaa` — RN accepts 8-digit hex, which keeps a wash honest about being a
 * *tint of the accent* rather than a separately invented colour.
 */
const alpha = (hex: string, percent: number): string =>
  `${hex}${Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, '0')}`

const channel = (hex: string, at: number): number => parseInt(hex.slice(at, at + 2), 16)

/** WCAG relative luminance. */
const luminance = (hex: string): number => {
  const part = (at: number): number => {
    const value = channel(hex, at) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * part(1) + 0.7152 * part(3) + 0.0722 * part(5)
}

const contrast = (a: string, b: string): number => {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Whichever of near-black or white reads better on a given colour.
 *
 * Two jobs: the ink on a bright accent fill, and the tick on a picker swatch — both
 * cases where a component holds a raw colour, so the readable counterpart has to be
 * derived from it rather than looked up from a role. It replaced a fixed
 * `textOnAccent`, which was white in light mode and therefore invisible on a white
 * swatch.
 *
 * It measures real contrast rather than a luma threshold, because a luma threshold
 * gets it wrong exactly where it matters. Indigo `#966DF6` lands at luma 137 — just
 * under a 140 cut-off, so the cheap version chose white, which is 3.0:1 on it and
 * fails AA. Near-black is 5.6:1. Choosing the better of the two is both simpler to
 * justify and correct at the boundary.
 */
export const inkOn = (hex: string): string =>
  contrast(hex, palette.slate900) >= contrast(hex, palette.white) ? palette.slate900 : palette.white

/**
 * An `rrggbbaa` tint composited onto an opaque colour, as an opaque colour.
 *
 * The native stack header needs this. A wash stop is translucent, and a platform
 * header is not a view this app draws — it cannot sit inside the gradient, so it
 * has to be *painted the colour the gradient starts at* instead. Handing it the
 * translucent stop would leave the result to whatever each platform composites a
 * header over (iOS blurs; Android does not), which is exactly the sort of thing
 * that looks right on one platform and wrong on the other. Flattening here makes
 * both identical: same arithmetic, same pixel.
 */
export const flatten = (over: string, base: string): string => {
  const a = over.length >= 9 ? channel(over, 7) / 255 : 1
  const mix = (at: number): string =>
    Math.round(channel(over, at) * a + channel(base, at) * (1 - a))
      .toString(16)
      .padStart(2, '0')

  return `#${mix(1)}${mix(3)}${mix(5)}`
}

/**
 * A fill taken down towards black, for its pressed state.
 *
 * Not the ink tone, which would be the obvious choice and is wrong: ink is dark
 * enough that dark-on-dark stops reading, so a press would make the label vanish. A
 * proportional darkening keeps the same ink valid at both ends of the press.
 */
const darken = (hex: string, percent: number): string => {
  const scale = 1 - percent / 100
  const mix = (at: number): string =>
    Math.round(channel(hex, at) * scale)
      .toString(16)
      .padStart(2, '0')

  return `#${mix(1)}${mix(3)}${mix(5)}`
}

/**
 * Light mode: a bright fill, a deep ink, and a wash strong enough to be a mood.
 *
 * The wash used to run 16/8/4% and the complaint was that the moods were barely
 * distinguishable — at those strengths every one of them is a pale grey-ish tint and
 * hue is all that separates them, which is nothing when the tint is that faint. It
 * now opens around 40%: enough that ocean and sunset are plainly different rooms.
 *
 * The middle stop is the **ink** tone rather than the fill, which is what makes the
 * gradient rich instead of merely long — the colour deepens as it descends before
 * resolving, so the page has a body to it and not just a fade.
 */
const lightMood = ({
  feeling,
  fill,
  ink,
  strength,
}: {
  readonly feeling: string
  readonly fill: string
  readonly ink: string
  /** Opening alpha of the wash, set near each hue's own legibility ceiling. */
  readonly strength: number
}): Mood => ({
  feeling,
  accent: fill,
  accentInk: ink,
  accentPressed: darken(fill, 14),
  swatch: [fill],
  wash: [alpha(fill, strength), alpha(ink, Math.round(strength * 0.42)), alpha(fill, 8)],
  card: [alpha(fill, 10), alpha(fill, 0)],
  tint: alpha(fill, 16),
  field: alpha(fill, 22),
  fieldBorder: alpha(ink, 34),
  glow: alpha(fill, 55),
})

/** Dark mode: one bright tone does both jobs, and the tint becomes depth. */
const darkMood = ({
  feeling,
  tone,
  strength,
}: {
  readonly feeling: string
  readonly tone: string
  readonly strength: number
}): Mood => ({
  feeling,
  accent: tone,
  accentInk: tone,
  accentPressed: darken(tone, 14),
  swatch: [tone],
  wash: [alpha(tone, strength), alpha(tone, Math.round(strength * 0.5)), alpha(tone, 10)],
  card: [alpha(tone, 14), alpha(tone, 0)],
  tint: alpha(tone, 18),
  field: alpha(tone, 24),
  fieldBorder: alpha(tone, 36),
  glow: alpha(tone, 60),
})

export const MOODS = {
  /**
   * White — the default, and the way out of every other mood.
   *
   * The plain page, kept as a first-class choice rather than an absence of one:
   * without it there was no way back to a white app once a colour had been picked,
   * which made choosing feel risky.
   *
   * Its wash is neutral slate rather than a hue, and it fades to nothing — the top
   * stop is 5% grey, about `#F9FAFA`, so the page reads as white while the gradient
   * machinery still has three real stops to work with. The fill is slate-900, so the
   * primary action is the near-black of the original product design.
   */
  plain: {
    light: {
      feeling: 'Clarity',
      accent: palette.slate900,
      accentInk: palette.slate700,
      accentPressed: palette.slate800,
      wash: [alpha(palette.slate500, 5), alpha(palette.slate500, 2), alpha(palette.slate500, 0)],
      card: [alpha(palette.slate500, 3), alpha(palette.slate500, 0)],
      tint: alpha(palette.slate500, 5),
      field: alpha(palette.slate500, 7),
      fieldBorder: alpha(palette.slate500, 22),
      glow: alpha(palette.slate500, 26),
      swatch: [palette.white],
    },
    dark: {
      feeling: 'Clarity',
      accent: palette.slate100,
      accentInk: palette.slate200,
      accentPressed: palette.slate300,
      wash: [alpha(palette.slate300, 9), alpha(palette.slate300, 5), alpha(palette.slate300, 0)],
      card: [alpha(palette.slate300, 5), alpha(palette.slate300, 0)],
      tint: alpha(palette.slate300, 7),
      field: alpha(palette.slate300, 10),
      fieldBorder: alpha(palette.slate300, 22),
      glow: alpha(palette.slate300, 32),
      swatch: [palette.slate900],
    },
  },
  /**
   * The six colours, each with its own wash strength.
   *
   * The strengths are not uniform, and that is the point: a pale cyan can carry 46%
   * before secondary text stops clearing AA against it, while indigo runs out at
   * 39%. Each mood is set near its own ceiling rather than all of them being pinned
   * to the weakest — which is what made them feel interchangeable.
   */
  ocean: {
    light: lightMood({ feeling: 'Coolness', fill: palette.oceanVivid, ink: palette.oceanInk, strength: 44 }),
    dark: darkMood({ feeling: 'Coolness', tone: palette.oceanSoft, strength: 42 }),
  },
  forest: {
    light: lightMood({ feeling: 'Comfort', fill: palette.forestVivid, ink: palette.forestInk, strength: 42 }),
    dark: darkMood({ feeling: 'Comfort', tone: palette.forestSoft, strength: 40 }),
  },
  rose: {
    light: lightMood({ feeling: 'Passion', fill: palette.roseVivid, ink: palette.roseInk, strength: 40 }),
    dark: darkMood({ feeling: 'Passion', tone: palette.roseSoft, strength: 38 }),
  },
  midnight: {
    light: lightMood({ feeling: 'Beauty', fill: palette.midnightVivid, ink: palette.midnightInk, strength: 36 }),
    dark: darkMood({ feeling: 'Beauty', tone: palette.midnightSoft, strength: 40 }),
  },
  sunset: {
    light: lightMood({ feeling: 'Warmth', fill: palette.sunsetVivid, ink: palette.sunsetInk, strength: 44 }),
    dark: darkMood({ feeling: 'Warmth', tone: palette.sunsetSoft, strength: 42 }),
  },
  /**
   * Aurora — the multi-hue one.
   *
   * Its wash crosses three hues where every other mood deepens one, and the hues are
   * chosen far apart on purpose: cyan at the top, orchid through the middle, rose at
   * the foot. The first version used the same low alpha as everything else and read
   * as a vague lilac smudge — sophistication here comes from the three colours being
   * *clearly* distinguishable as they cross, not from being whispered.
   *
   * Its swatch is the same three at full strength, so a single dot can say "several
   * colours" before you tap it.
   */
  aurora: {
    light: {
      feeling: 'Wonder',
      accent: palette.auroraVivid,
      accentInk: palette.auroraInk,
      accentPressed: darken(palette.auroraVivid, 14),
      wash: [alpha(palette.oceanVivid, 44), alpha(palette.auroraVivid, 34), alpha(palette.roseVivid, 18)],
      card: [alpha(palette.auroraVivid, 10), alpha(palette.auroraVivid, 0)],
      tint: alpha(palette.auroraVivid, 16),
      field: alpha(palette.auroraVivid, 22),
      fieldBorder: alpha(palette.auroraInk, 34),
      glow: alpha(palette.roseVivid, 55),
      swatch: [palette.oceanVivid, palette.auroraVivid, palette.roseVivid],
    },
    dark: {
      feeling: 'Wonder',
      accent: palette.auroraSoft,
      accentInk: palette.auroraSoft,
      accentPressed: darken(palette.auroraSoft, 14),
      wash: [alpha(palette.oceanSoft, 40), alpha(palette.auroraSoft, 30), alpha(palette.roseSoft, 16)],
      card: [alpha(palette.auroraSoft, 14), alpha(palette.auroraSoft, 0)],
      tint: alpha(palette.auroraSoft, 18),
      field: alpha(palette.auroraSoft, 24),
      fieldBorder: alpha(palette.auroraSoft, 36),
      glow: alpha(palette.roseSoft, 60),
      swatch: [palette.oceanSoft, palette.auroraSoft, palette.roseSoft],
    },
  },
} as const satisfies Record<string, { readonly light: Mood; readonly dark: Mood }>

