import { DarkTheme, DefaultTheme } from '@react-navigation/native'
import type { Theme as NavigationTheme } from '@react-navigation/native'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

import type { AppTheme } from '@/theme'

/**
 * Bridges the Unistyles theme into React Navigation.
 *
 * Two things need it and neither is styled by a stylesheet:
 *
 *  - the **container theme**, which paints the background *behind* screens. Left
 *    at the default it is white, so a push in dark mode flashes white for the
 *    length of the transition.
 *  - the **native header**, which is a platform view. Its colours are set
 *    through navigation options, not styles.
 */

export const buildNavigationTheme = (theme: AppTheme): NavigationTheme => {
  const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme

  return {
    ...base,
    dark: theme.mode === 'dark',
    colors: {
      ...base.colors,
      primary: theme.colors.accentInk,
      // Also the wash's first stop, so a push never flashes white across a tinted page.
      background: theme.colors.headerSurface,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  }
}

/**
 * Header options for a native stack.
 *
 * `headerTitleStyle` only accepts font properties on a native header — colour,
 * size and weight — so it is set here rather than in a stylesheet.
 */
export const buildHeaderOptions = (theme: AppTheme): NativeStackNavigationOptions => ({
  // The wash's first stop, not `background`: a header painted plain white sat as an
  // opaque band above the gradient, with a seam where the wash started below it.
  headerStyle: { backgroundColor: theme.colors.headerSurface },
  headerTintColor: theme.colors.accentInk,
  headerTitleStyle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  // A hairline under the header competes with card borders; the background
  // already separates it.
  headerShadowVisible: false,
})
