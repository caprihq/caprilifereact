import { elevation, fontSize, fontWeight, letterSpacing, palette, radius, size, spacing } from './tokens'
import { MOODS, flatten, inkOn } from './moods'

/**
 * The theme objects Unistyles swaps between.
 *
 * Two axes, matching the web client: an accent (five named themes) and a mode
 * (light or dark). That is ten registered themes — Unistyles switches them at
 * native level, so changing one re-styles the app with no React re-render.
 *
 * PALETTE PROVENANCE. The web client paints with Tailwind **slate**: 766 usages
 * across web/src, and zero gray, neutral or zinc. Its shadcn CSS variables in
 * index.css only serve shadcn's own primitives. So slate is the product palette,
 * and `primary` is slate-900 — the dark action colour in the product design, not
 * the accent. Accents are for highlights and links.
 */

/** `plain` leads because it is the default: a white app, with the colours offered next to it. */
export const ACCENT_NAMES = [
  'plain',
  'ocean',
  'forest',
  'rose',
  'midnight',
  'sunset',
  'aurora',
] as const
export type AccentName = (typeof ACCENT_NAMES)[number]

export type ThemeMode = 'light' | 'dark'

export const isAccentName = (value: unknown): value is AccentName =>
  typeof value === 'string' && (ACCENT_NAMES as readonly string[]).includes(value)

/**
 * Accents come from `moods.ts`, which pairs each hue with the wash, tint and glow
 * that make the choice felt across a whole screen rather than on a few icons.
 */
const ACCENTS: Record<AccentName, { readonly light: string; readonly dark: string }> = {
  plain: { light: MOODS.plain.light.accent, dark: MOODS.plain.dark.accent },
  ocean: { light: MOODS.ocean.light.accent, dark: MOODS.ocean.dark.accent },
  forest: { light: MOODS.forest.light.accent, dark: MOODS.forest.dark.accent },
  rose: { light: MOODS.rose.light.accent, dark: MOODS.rose.dark.accent },
  midnight: { light: MOODS.midnight.light.accent, dark: MOODS.midnight.dark.accent },
  sunset: { light: MOODS.sunset.light.accent, dark: MOODS.sunset.dark.accent },
  aurora: { light: MOODS.aurora.light.accent, dark: MOODS.aurora.dark.accent },
}

/**
 * The accent colour as it will actually appear, for painting a swatch.
 *
 * Exported because the appearance picker has to *show* the colours — the one
 * legitimate case for a component knowing a hex, and the reason it comes from here
 * rather than from `palette`, which stays private to `src/theme` (§4.2).
 */
export const accentColorFor = (accent: AccentName, mode: ThemeMode): string =>
  ACCENTS[accent][mode]

/** The mood's full-page wash. Aurora's three stops are three hues; the rest thin one. */
const washFor = (accent: AccentName, mode: ThemeMode): readonly string[] =>
  MOODS[accent][mode].wash

/** For the picker, which paints a miniature of each mood. */
export const moodFor = (accent: AccentName, mode: ThemeMode) => ({
  ...MOODS[accent][mode],
  wash: washFor(accent, mode),
})

const light = {
  background: palette.white,
  surface: palette.white,
  surfaceRaised: palette.slate50,
  /** Input and muted-block fill. */
  fill: palette.slate50,
  border: palette.slate200,
  textPrimary: palette.slate900,
  /**
   * A step darker than before (slate-500/400), because the wash is a step stronger.
   * Secondary text on a 46% tint measured 4.3:1 at slate-500 and 6.3:1 at slate-600 —
   * strengthening the colour without moving the text would have traded legibility
   * for it.
   */
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  /** The focal action colour. Never the accent. */
  primary: palette.slate900,
  primaryPressed: palette.slate800,
  textOnPrimary: palette.white,
  /** Overridden per accent below: a bright fill needs dark ink, not white. */
  textOnAccent: palette.white,
  danger: palette.red500,
  warning: palette.amber500,
  success: palette.green600,
  scrim: palette.scrim,
} as const

/**
 * Dark mode, lifted one step off black.
 *
 * It used to start at slate-950 (`#020617`) — near-black, which reads as a void
 * rather than as a room with the lights low, and left muted text at 3:1 on a card.
 * Starting at slate-900 and letting each surface sit a step above it gives cards
 * something to be raised *from*, and lets the mood's wash actually show: a tint at
 * 22% over near-black is almost invisible, over slate-900 it is a colour.
 *
 * Secondary and muted text moved up a step with it (slate-300/400), so both clear
 * AA on a card instead of hovering at 3:1.
 */
const dark = {
  background: palette.slate900,
  surface: palette.slate800,
  surfaceRaised: palette.slate700,
  fill: palette.slate700,
  border: palette.slate600,
  textPrimary: palette.slate100,
  textSecondary: palette.slate300,
  textMuted: palette.slate400,
  // Inverts, so the focal action stays legible on a dark ground.
  primary: palette.slate100,
  primaryPressed: palette.slate300,
  textOnPrimary: palette.slate900,
  /**
   * Dark-mode accents are *soft* tones, so ink on them must be dark: white on
   * `oceanSoft` is about 2:1, which is unreadable. This was white in both modes.
   */
  textOnAccent: palette.slate950,
  danger: palette.redSoft,
  warning: palette.amber400,
  success: palette.green600,
  scrim: palette.scrim,
} as const

/** Everything a style can reach. Shared across every theme. */
const shared = { spacing, radius, fontSize, fontWeight, elevation, size, letterSpacing } as const

/**
 * Colour roles. Values are widened to `string` deliberately — the light and dark
 * objects hold different literals, and a style must depend on the *role*, never
 * on which hex happens to be behind it.
 */
export type ThemeColors = Record<
  | keyof typeof light
  | 'accent'
  | 'accentPressed'
  | 'accentInk'
  | 'accentTint'
  | 'accentGlow'
  | 'headerSurface'
  | 'footerSurface',
  string
>

export type AppTheme = {
  readonly name: string
  readonly mode: ThemeMode
  readonly colors: ThemeColors
  readonly wash: readonly string[]
  readonly cardWash: readonly [string, string]
  readonly feeling: string
} & typeof shared

const build = (accent: AccentName, mode: ThemeMode): AppTheme => ({
  name: `${accent}-${mode}`,
  mode,
  colors: {
    ...(mode === 'dark' ? dark : light),
    accent: ACCENTS[accent][mode],
    /**
     * Ink in the mood's own hue, for anything that is text rather than a surface.
     * Separate from `accent` because the fill is now bright enough that text in the
     * same tone would sit at about 2:1 on the page.
     */
    accentInk: MOODS[accent][mode].accentInk,
    // A darkening of the fill, so the same ink still reads while pressed.
    accentPressed: MOODS[accent][mode].accentPressed,
    /**
     * Ink *on* the fill, derived per accent rather than per mode. A bright cyan takes
     * dark ink at 11:1 where white would be 1.9:1; slate-900 White takes white ink.
     * Fixed per mode, one of those two is always wrong.
     */
    textOnAccent: inkOn(ACCENTS[accent][mode]),
    /** Card and chip fill in the chosen mood — a few percent of the accent. */
    accentTint: MOODS[accent][mode].tint,
    /** Selection halo: the one place the colour is meant to be obvious. */
    accentGlow: MOODS[accent][mode].glow,
    /** Input fill and border, so a field belongs to the mood. */
    fill: MOODS[accent][mode].field,
    border: MOODS[accent][mode].fieldBorder,
    /**
     * The native header, painted the colour the page's wash begins at.
     *
     * A platform header is not a view this app draws, so it cannot sit inside the
     * gradient — left on `background` it was an opaque white band with a visible
     * seam where the wash started underneath it, which made a full-page gradient
     * look like a decorated panel. Matching the first stop closes the seam: the
     * colour now runs from the status bar to the home indicator.
     */
    headerSurface: flatten(
      washFor(accent, mode)[0] ?? '',
      mode === 'dark' ? dark.background : light.background,
    ),
    /** The tab bar, painted where the wash ends — the same seam, at the bottom. */
    footerSurface: flatten(
      washFor(accent, mode).at(-1) ?? '',
      mode === 'dark' ? dark.background : light.background,
    ),
  },
  /** Two- or three-stop wash for the screen background, top to bottom. */
  wash: washFor(accent, mode),
  /** A card's own gradient, so a surface catches the page's colour. */
  cardWash: MOODS[accent][mode].card,
  /** One word for what this mood is meant to feel like. */
  feeling: MOODS[accent][mode].feeling,
  ...shared,
})

/** `{ 'ocean-light': …, 'ocean-dark': …, 'rose-light': … }` — ten in total. */
export const themes = Object.fromEntries(
  ACCENT_NAMES.flatMap((accent) => [
    [`${accent}-light`, build(accent, 'light')],
    [`${accent}-dark`, build(accent, 'dark')],
  ]),
) as Record<string, AppTheme>

export const themeNameFor = (accent: AccentName, mode: ThemeMode): string => `${accent}-${mode}`

/**
 * The resolved theme for a choice.
 *
 * Built rather than looked up: `themes` is keyed by string for Unistyles'
 * registration, so indexing it yields `AppTheme | undefined` and every consumer
 * would need a fallback for a case that cannot happen.
 */
export const themeFor = (accent: AccentName, mode: ThemeMode): AppTheme => build(accent, mode)
