import { Platform } from 'react-native'

import type { AppTheme } from '@/theme'

/**
 * Appearance props for the native date and time picker.
 *
 * **`themeVariant` is the fix for an invisible calendar.** On iOS the picker
 * follows the *system* appearance rather than the app's, so a phone in dark mode
 * showing an app set to light drew white day numbers on a white sheet: the whole
 * month was there and unreadable, with only the selected day and today visible
 * because those are tinted. Binding the variant to our own resolved mode is the
 * only way to make the two agree.
 *
 * `accentColor` puts the selection in the chosen mood's ink instead of iOS system
 * blue, so the picker belongs to the app. `textColor` covers the spinner display,
 * which does not take the variant's text colour.
 *
 * All three are iOS-only. Android's picker is a dialog that follows the app's own
 * theme, so it needs none of them.
 */
export type PickerAppearance = {
  readonly themeVariant?: 'light' | 'dark'
  readonly accentColor?: string
  readonly textColor?: string
}

export const pickerAppearance = (theme: AppTheme): PickerAppearance =>
  Platform.OS === 'ios'
    ? {
        themeVariant: theme.mode,
        accentColor: theme.colors.accentInk,
        textColor: theme.colors.textPrimary,
      }
    : {}
