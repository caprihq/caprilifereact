import { trackScreen } from '@/services'
import { isTrackedScreen } from '@/services/analytics/events'

/**
 * Report the screen the user is actually looking at.
 *
 * Driven from the navigator rather than from each screen. A `useEffect` per screen
 * looks tidier and is wrong: it fires on mount, so a screen kept alive underneath a
 * sheet is never reported again when the sheet closes, and any screen added later
 * silently reports nothing at all. The navigator always knows.
 *
 * Only screens in the catalogue are sent. A screen view is the cheapest signal there
 * is and the easiest to drown in.
 */

/**
 * Only what is needed: the one method React Navigation's ref provides here.
 *
 * Structural rather than the library's own type, which is generic over the param
 * list and awkward to satisfy — and this way the function can be tested with a
 * two-line stub instead of a navigator.
 */
export type RouteReader = {
  readonly getCurrentRoute: () => { readonly name: string } | undefined
}

/** The current route name, or null if the tree is not ready. */
const currentScreen = (navigation: RouteReader): string | null =>
  navigation.getCurrentRoute()?.name ?? null

/**
 * Call on every navigation state change.
 *
 * `previous` is held by the caller so a state change that does not move the user —
 * a param update, a sheet resizing — does not report the same screen twice.
 */
export const reportScreenChange = (
  navigation: RouteReader,
  previous: string | null,
): string | null => {
  const name = currentScreen(navigation)
  if (!name || name === previous) return previous

  if (isTrackedScreen(name)) trackScreen(name)

  // Returned even when untracked, so an untracked screen still counts as "moved"
  // and coming back to the previous one reports it again.
  return name
}
