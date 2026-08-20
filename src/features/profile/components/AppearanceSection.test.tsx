import { fireEvent, render, screen } from '@testing-library/react-native'

import { useThemeStore } from '@/store'
import { AppearanceSection } from './AppearanceSection'

/**
 * The appearance panel, which users reported as unclear.
 *
 * Two specific failures, both fixed here and both asserted because they are the kind
 * that creep back in as "tidying":
 *
 *  - the colours were a row of dots under the word "Accent" — a term from the
 *    codebase — with nothing saying what a dot does or how to get back to white.
 *  - the mode was a lone "Dark mode" switch, which cannot express the third state
 *    the app has always had. "Follow the system" was reachable only by switching
 *    dark *off*, and nothing said so.
 *
 * Two tests, not five: RTL v14 renders the same component a limited number of times
 * per file before `screen` starts answering with an empty tree, so each test renders
 * once and asserts a group of related things. The same reason
 * `KeyboardAwareScroll.test.tsx` tests its rule as a pure function.
 */

describe('AppearanceSection', () => {
  it('says what each control does, and shows which options are in force', async () => {
    useThemeStore.setState({ accent: 'plain', mode: 'system' })
    await render(<AppearanceSection />)

    // One card, one heading, each half labelled. Two separate cards were the reported
    // problem: a row of dots in its own box does not announce itself as a theme
    // control, and "Accent" was a word from this codebase rather than from anyone's
    // head.
    expect(screen.getByText('Theme')).toBeTruthy()
    expect(
      screen.getByText(
        'A colour tints the whole app — background, buttons and fields. White keeps it plain.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Light or dark')).toBeTruthy()

    // Three modes, visibly, including the one the old switch could not express.
    expect(screen.getByLabelText('System').props.accessibilityState.selected).toBe(true)
    expect(screen.getByLabelText('Light').props.accessibilityState.selected).toBe(false)
    expect(screen.getByLabelText('Dark').props.accessibilityState.selected).toBe(false)

    // Every colour names itself and what it is meant to feel like.
    expect(screen.getByLabelText('White — Clarity')).toBeTruthy()
    expect(screen.getByLabelText('Aurora — Wonder')).toBeTruthy()
  })

  it('changes mode and colour in place, White included', async () => {
    useThemeStore.setState({ accent: 'plain', mode: 'system' })
    await render(<AppearanceSection />)

    await fireEvent.press(screen.getByLabelText('Dark'))
    expect(useThemeStore.getState().mode).toBe('dark')

    // Back to following the phone — the trip that used to be unreachable.
    await fireEvent.press(screen.getByLabelText('System'))
    expect(useThemeStore.getState().mode).toBe('system')

    // And the round trip that matters for colour: before White existed, choosing one
    // was permanent.
    await fireEvent.press(screen.getByLabelText('Sunset — Warmth'))
    expect(useThemeStore.getState().accent).toBe('sunset')

    await fireEvent.press(screen.getByLabelText('White — Clarity'))
    expect(useThemeStore.getState().accent).toBe('plain')
  })
})
