import { Platform } from 'react-native'

import { themes } from '@/theme'
import { pickerAppearance } from './pickerAppearance'

/**
 * The reported bug: in light mode the date picker's day numbers were white, so the
 * calendar was unreadable except for the two tinted days.
 *
 * The cause is that iOS's picker follows the *system* appearance, not the app's, so
 * a phone in dark mode plus an app set to light produces dark-mode text on a light
 * sheet. Nothing in the type system objects, and it is invisible to anyone whose
 * phone happens to match their app setting, which is why it is worth a test.
 */

const themeFor = (mode: 'light' | 'dark') => {
  const theme = themes[`ocean-${mode}`]
  if (!theme) throw new Error(`ocean-${mode} is not registered`)
  return theme
}

describe('pickerAppearance', () => {
  it('follows the app mode rather than the device', () => {
    if (Platform.OS !== 'ios') {
      // Android's picker is a dialog that already takes the app's theme.
      expect(pickerAppearance(themeFor('light'))).toEqual({})
      return
    }

    expect(pickerAppearance(themeFor('light')).themeVariant).toBe('light')
    expect(pickerAppearance(themeFor('dark')).themeVariant).toBe('dark')
  })

  it('tints the selection with the mood, not iOS blue', () => {
    if (Platform.OS !== 'ios') return

    const light = themeFor('light')
    expect(pickerAppearance(light).accentColor).toBe(light.colors.accentInk)
    // Ink, not the bright fill: this colours a date label, which has to be readable.
    expect(pickerAppearance(light).accentColor).not.toBe(light.colors.accent)
  })

  it('sets spinner text from the theme, since the variant does not', () => {
    if (Platform.OS !== 'ios') return

    const dark = themeFor('dark')
    expect(pickerAppearance(dark).textColor).toBe(dark.colors.textPrimary)
  })
})
