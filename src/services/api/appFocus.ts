import { AppState } from 'react-native'
import type { AppStateStatus } from 'react-native'
import { focusManager } from '@tanstack/react-query'

/**
 * Tell React Query when the app is in front of the user.
 *
 * `refetchOnWindowFocus` is a browser idea: it listens for `window.focus`, which
 * React Native does not have. Left unbridged the option is not merely default-off,
 * it is inert — which is why it was set to `false` here. The consequence was a real
 * bug rather than a missing nicety: a phone with CAPRI warm in the background showed
 * whatever it had fetched hours ago, in the app itself, until something else
 * happened to invalidate a query. Coming back to an app and reading yesterday's
 * priorities is the kind of wrong that costs trust.
 *
 * With this bridge, resuming refetches anything past its `staleTime` (30 seconds),
 * which also carries the home-screen widget: Home republishes its snapshot as soon
 * as the data changes.
 */

/**
 * `inactive` is not `background`.
 *
 * iOS reports `inactive` while the app is mid-transition — the app switcher, an
 * incoming call, a system permission sheet over the top. Treating that as
 * "unfocused" makes React Query see a focus *change* every time one of those
 * appears and disappears, so dismissing a permission dialog would fire a refetch
 * storm. Only a genuine background counts.
 */
export const isAppFocused = (state: AppStateStatus): boolean => state === 'active'

/**
 * Start the bridge. Returns the teardown, so a caller's effect can clean up.
 *
 * Subscribed once at the app root rather than per screen: focus is a property of the
 * process, and several subscribers would each push the same value into a global.
 */
export const startFocusBridge = (): (() => void) => {
  focusManager.setFocused(isAppFocused(AppState.currentState))

  const subscription = AppState.addEventListener('change', (state) => {
    focusManager.setFocused(isAppFocused(state))
  })

  return () => {
    subscription.remove()
  }
}
