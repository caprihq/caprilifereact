/**
 * Width breakpoints.
 *
 * Phones are the design target; `md` and up exist so a tablet does not simply
 * stretch phone layouts to full width — the IC_Tablet AVD showed exactly that,
 * with buttons spanning 2560px edge to edge.
 */
export const breakpoints = {
  xs: 0,
  /** Large phones. */
  sm: 420,
  /** Small tablets — content should stop growing and centre. */
  md: 768,
  lg: 1024,
} as const

export type AppBreakpoints = typeof breakpoints
