import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { useThemeStore } from './themeStore'

/**
 * What the app looks like before anyone has chosen anything.
 *
 * White and "follow the system" — so a first launch is a plain app on the phone's
 * own light or dark setting, and every colour in it is something the user asked
 * for. A default of `ocean` meant the app arrived already wearing a colour nobody
 * picked, and until White existed there was no way to take it off.
 */

describe('appearance defaults', () => {
  it('starts white, following the system', () => {
    const { accent, mode } = useThemeStore.getState()

    expect(accent).toBe('plain')
    expect(mode).toBe('system')
  })

  it('ignores an accent name it does not know', () => {
    // The choice is persisted, so a rename or a downgrade can hand this a stale
    // value; it must not leave the app pointing at a theme that isn't registered.
    useThemeStore.getState().setAccent('chartreuse')
    expect(useThemeStore.getState().accent).toBe('plain')

    useThemeStore.getState().setAccent('sunset')
    expect(useThemeStore.getState().accent).toBe('sunset')

    useThemeStore.setState({ accent: 'plain' })
  })
})

describe('switching theme touches nothing native', () => {
  /**
   * The reported crash: choosing Light while in Dark killed the app.
   *
   * Changing mode is the largest re-render the app performs — every colour, every
   * page wash, every card gradient and the native tab bar, in one commit — and this
   * store used to add `UnistylesRuntime.setTheme()` to that same tick: a Nitro hop
   * into native whose result **nothing reads**, since no component renders from a
   * Unistyles theme. It was risk with no payoff, so it is gone.
   *
   * Asserted against the source because the danger is a well-meaning restoration:
   * `setTheme` looks like the thing that ought to be called when a theme changes.
   */
  const source = readFileSync(join(__dirname, 'themeStore.ts'), 'utf8')
  /** Comments stripped: the file *explains* what it no longer does. */
  const code = source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')

  it('makes no call into Unistyles', () => {
    expect(code).not.toContain('UnistylesRuntime')
    expect(code).not.toContain('react-native-unistyles')
  })

  it('resolves "system" through React Native itself', () => {
    expect(code).toContain('Appearance.getColorScheme()')
  })

  it('changes mode without throwing, and remembers the choice', () => {
    useThemeStore.getState().setMode('dark')
    expect(useThemeStore.getState().mode).toBe('dark')

    // The failing move, in the order the user reported it.
    useThemeStore.getState().setMode('light')
    expect(useThemeStore.getState().mode).toBe('light')

    useThemeStore.setState({ mode: 'system' })
  })
})
