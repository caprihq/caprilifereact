/**
import { size } from '@/theme'
 * Non-visual app constants.
 *
 * Layout values that used to live beside the design tokens (`size.screenPadding`,
 * `size.tapTarget`) now belong to the theme as `size.*`, so styles reach
 * them the same way they reach colours. What is left here is genuinely
 * configuration rather than design.
 */

/** How long a toast stays up. */
export const FEEDBACK_DURATION_MS = 4000

/** React Query defaults. */
export const QUERY_DEFAULTS = {
  retry: 2,
  staleTime: 30_000,
  userStaleTime: 60_000,
  calendarStaleTime: 5 * 60_000,
} as const
