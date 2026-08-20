/**
 * Raw design tokens — the only place literal style values may exist (§4.2).
 *
 * Nothing outside `src/theme/` may import this file. Styles receive resolved
 * roles (`theme.colors.primary`), never a palette entry, so changing a token
 * changes every consumer. An ESLint `no-restricted-imports` rule enforces it.
 */

export const palette = {
  // Accent pairs for the five named themes, matching web useTheme.jsx.
  /**
   * Accent tones — **two per hue, because one cannot be both bright and readable.**
   *
   * Every earlier attempt at this palette was capped by the same conflict: a single
   * accent had to fill a button *and* be link text on white, and text on white
   * needs 4.5:1, which caps relative luminance at ≈0.183. Any colour bright enough
   * to feel vivid fails that, so the accents kept coming back muted — the reason
   * the app still read as dull after being brightened once already.
   *
   * Splitting the roles removes the cap:
   *
   *   `Vivid` — the fill. Bright and saturated, with **dark ink on top**, which is
   *     what buys the brightness: dark-on-bright clears 5.6–14.9:1, where
   *     white-on-bright would fail. Luminance 0.27–0.69, against 0.17 before.
   *   `Ink` — the same hue taken down to 4.7:1 on white, for anything that *is*
   *     ink: link text, icons, a focused field's border, the active tab label.
   *   `Soft` — dark mode, where one tone does both jobs: bright enough to clear
   *     4.8:1 on a card as text, dark enough to take dark ink as a fill.
   *
   * The hues are the ones people name — **blue, green, orange, red, purple,
   * magenta** — rather than the in-between shades this started with (cyan, mint,
   * amber). "Ocean" reading as cyan and "Sunset" as amber made the set feel washed
   * even at full strength, because a colour nobody has a word for reads as a tint
   * of something else.
   *
   * Each fill is the most *chromatic* version of its hue that dark ink still clears
   * 4.6:1 on — maximum colour rather than maximum lightness, which is the difference
   * between `#FF7700` and a peach. Chasing lightness instead produced pastels that
   * were bright but weak, and weak was the complaint.
   *
   * The hues are also spread to keep the *pages* apart, not just the swatches: blue
   * at 210 crowded violet at 262 once both were washed across a screen, and red
   * crowded orange. At 210/145/28/340/272/305 the five single-hue moods differ by at
   * least 47 of 255 per channel somewhere down the page, asserted in
   * `accents.test.ts`.
   */
  /** Semantic success. Muted like the accents, so a tick does not shout. */
  green600: '#2E9E68',

  oceanVivid: '#2E96FF',
  oceanInk: '#1774D2',
  oceanSoft: '#4098F0',
  roseVivid: '#FF4F8A',
  roseInk: '#E0195B',
  roseSoft: '#F26191',
  forestVivid: '#00FF6A',
  forestInk: '#0F8540',
  forestSoft: '#11D462',
  midnightVivid: '#B866FF',
  midnightInk: '#9D44EA',
  midnightSoft: '#B976F4',
  auroraVivid: '#FF4AF0',
  auroraInk: '#CD17BE',
  auroraSoft: '#F14EE3',
  sunsetVivid: '#FF7700',
  sunsetInk: '#B15D14',
  sunsetSoft: '#E77613',

  // Status.
  red500: '#EF4444',
  redSoft: '#FF6B6B',
  amber400: '#FBBF24',
  amber500: '#FFB020',

  // Tailwind slate — the web client's actual palette (766 usages, vs 0 neutral).
  white: '#FFFFFF',
  black: '#000000',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',

  /** Modal backdrop. */
  scrim: 'rgba(2, 6, 23, 0.55)',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

/** The web client's `--radius` is 0.5rem; `md` matches it. */
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  /** Cards. A larger corner is what separates a card from a bordered box. */
  xxl: 22,
  full: 9999,
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

/** Fixed dimensions, so controls line up across screens. */
export const size = {
  /** Apple's minimum comfortable hit target. */
  tapTarget: 44,
  /** Inputs and buttons. */
  control: 52,
  /** The OTP code field. */
  codeInput: 56,
  /** Horizontal gutter for full-screen content. */
  screenPadding: 24,
  hairline: 1,
} as const

export const letterSpacing = {
  wordmark: 2,
  code: 8,
} as const

/**
 * Depth. iOS reads shadow*, Android only reads `elevation` and only when the
 * view has a background colour — both are set so one token covers both.
 *
 * Deepened across the board. The old values were so faint that cards read as flat
 * panels drawn on the page rather than as surfaces sitting above it, which is most
 * of what made the layout look unfinished — a card is defined by the light it
 * catches and the shadow it drops, and 6% at 8pt drops almost nothing. The shadow
 * is also *tinted* at the point of use, not here: a neutral black shadow under a
 * strongly washed page turns grey and dirty.
 */
export const elevation = {
  low: {
    shadowColor: palette.black,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  medium: {
    shadowColor: palette.black,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  high: {
    shadowColor: palette.black,
    shadowOpacity: 0.24,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
} as const
