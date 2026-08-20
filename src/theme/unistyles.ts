import { StyleSheet } from 'react-native-unistyles'

import { breakpoints } from './breakpoints'
import { themes } from './themes'

/**
 * Unistyles registration. Imported once, for its side effect, before any
 * component renders — see index.js.
 *
 * **Configured, not consumed.** Every style in the app is a plain React Native
 * style taking colours from `useTheme()`, so no component reads a Unistyles theme —
 * but the Babel plugin still requires a configured instance, and without one the app
 * mounts and renders an empty tree. This registration is therefore load-bearing
 * while the themes themselves are inert.
 */

type AppThemes = typeof themes
type AppBreakpoints = typeof breakpoints

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends AppThemes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes,
  breakpoints,
  settings: {
    // Matches the store's default (White, light). Nothing renders from this any
    // more, but a name that is not registered would throw at startup.
    initialTheme: 'plain-light',
  },
})
