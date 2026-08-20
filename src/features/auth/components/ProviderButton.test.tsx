import { StyleSheet } from 'react-native'
import { render, screen } from '@testing-library/react-native'

import { themes } from '@/theme'
import { ProviderButton } from './ProviderButton'

/**
 * The first screen holds two colours.
 *
 * It used to hold three — a white Google button, a black Apple one, and the accent
 * under "Sign in with email" — which is one more than a screen with four buttons can
 * carry. Both providers now share a neutral surface, leaving the accent to mark the
 * one action that does something new.
 *
 * Worth pinning, because the obvious "fix" is to give Apple its black button back,
 * and that quietly puts the third colour on the screen again.
 */

const surfaceOf = (label: string): unknown => {
  const style = screen.getByLabelText(label).props.style as Parameters<typeof StyleSheet.flatten>[0]

  return (StyleSheet.flatten(style) as { backgroundColor?: string }).backgroundColor
}

describe('ProviderButton', () => {
  it('gives Google and Apple the same surface', async () => {
    await render(
      <>
        <ProviderButton provider="google" onPress={() => undefined} />
        <ProviderButton provider="apple" onPress={() => undefined} />
      </>,
    )

    expect(surfaceOf('Continue with Google')).toBe(surfaceOf('Continue with Apple'))
  })

  it('keeps that surface neutral, so the accent stays the focal action', async () => {
    await render(<ProviderButton provider="apple" onPress={() => undefined} />)

    // Not the mood's tinted fill, and not the accent — a provider button that takes
    // the theme's colour stops reading as a provider button.
    const theme = themes['plain-light']
    expect(surfaceOf('Continue with Apple')).toBe(theme?.colors.surface)
    expect(surfaceOf('Continue with Apple')).not.toBe(theme?.colors.accent)
  })
})
