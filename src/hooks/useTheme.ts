import { useColorScheme } from 'react-native'

import { themeFor } from '@/theme'
import type { AppTheme, ThemeMode } from '@/theme'
import { useThemeStore } from '@/store'

/**
 * The resolved theme.
 *
 * Derived from the **store**, not from Unistyles, and that is the whole point.
 * Unistyles re-styles its own `StyleSheet.create` factories natively with no
 * re-render — but this codebase reads colours in JS in every component and has no
 * themed factories at all, so nothing was covered by that mechanism. The theme
 * changed natively and the JS tree never heard about it: picking a colour repainted
 * only whatever happened to re-render for another reason.
 *
 * Unistyles is now configured and otherwise unused; the store stopped calling into
 * it, which took a native hop out of the light/dark switch — the single largest
 * commit the app performs.
 *
 * A Zustand selector re-renders every subscriber, reliably, so a colour change is
 * now visible everywhere at once. It costs a re-render of the subscribed tree on
 * change — which happens only when a user deliberately picks a theme, and is a fair
 * price for the app actually changing colour.
 *
 * `useColorScheme()` supplies the OS preference so "system" follows the phone live,
 * rather than being resolved once at startup.
 */
export const useTheme = (): AppTheme => {
  const accent = useThemeStore((state) => state.accent)
  const mode = useThemeStore((state) => state.mode)
  const osScheme = useColorScheme()

  const resolved: ThemeMode = mode === 'system' ? (osScheme === 'dark' ? 'dark' : 'light') : mode

  return themeFor(accent, resolved)
}
