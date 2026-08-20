import { Platform, Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'

import { KeyboardAwareScroll, resolveJustify } from './KeyboardAwareScroll'

/**
 * The contract that keeps forms usable while typing.
 *
 * The bug this prevents: content centred with `justifyContent: 'center'` is clipped
 * at *both* ends once the keyboard halves the viewport, while the scroll offset stays
 * at zero — so the submit button sits below the fold and scrolling up only reveals
 * the title.
 *
 * The rule is tested as a pure function rather than by simulating keyboard events
 * against a renderer. RTL v14 makes that simulation unreliable — `render` is async,
 * the `UNSAFE_*` queries are gone, and a second render in one file leaves `toJSON()`
 * answering null — and a test that fights its harness proves less than one that
 * states the rule outright.
 */

describe('resolveJustify', () => {
  it('centres a short form on an idle screen', () => {
    expect(resolveJustify('center', false)).toBe('center')
  })

  it('stops centring the moment the keyboard appears', () => {
    // The whole point: centred content in a halved viewport puts the submit button
    // out of reach, and no amount of scrolling recovers it.
    expect(resolveJustify('center', true)).toBe('flex-start')
  })

  it('never centres a screen that asked for top alignment', () => {
    // The OTP screen arrives with its keyboard already open, so it must not jump.
    expect(resolveJustify('top', false)).toBe('flex-start')
    expect(resolveJustify('top', true)).toBe('flex-start')
  })
})

describe('KeyboardAwareScroll props', () => {
  /** Props of the scroll view, read from the rendered tree. */
  const scrollProps = (): Record<string, unknown> => {
    type Json = { props: Record<string, unknown>; children: readonly Json[] | null }
    const search = (node: unknown): Json | null => {
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = search(child)
          if (found) return found
        }
        return null
      }
      if (typeof node !== 'object' || node === null) return null
      const candidate = node as Json
      if ('contentContainerStyle' in candidate.props) return candidate
      return search(candidate.children)
    }
    const found = search(screen.toJSON())
    if (!found) throw new Error('no scroll view was rendered')
    return found.props
  }

  const flatten = (value: unknown): Record<string, unknown> =>
    Array.isArray(value)
      ? value.reduce<Record<string, unknown>>((acc, item) => ({ ...acc, ...flatten(item) }), {})
      : ((value ?? {}) as Record<string, unknown>)

  it('sets the props that make a form usable with the keyboard up', async () => {
    await render(
      <KeyboardAwareScroll>
        <Text>field</Text>
      </KeyboardAwareScroll>,
    )

    const props = scrollProps()

    // Without this the first tap on a visible button only dismisses the keyboard,
    // which reads as the button being broken.
    expect(props.keyboardShouldPersistTaps).toBe('handled')
    expect(props.keyboardDismissMode).toBe('on-drag')
    // iOS insets itself and scrolls the focused field into view; pairing that with a
    // KeyboardAvoidingView double-compensates and pushes fields off the top.
    expect(props.automaticallyAdjustKeyboardInsets).toBe(Platform.OS === 'ios')

    const content = flatten(props.contentContainerStyle)
    expect(content.flexGrow).toBe(1)
    // A gap so the last control clears the keyboard's edge.
    expect(content.paddingBottom).toBeGreaterThan(0)
  })
})
