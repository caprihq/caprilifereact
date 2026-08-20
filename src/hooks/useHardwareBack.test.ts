import { exitPrompt } from './useHardwareBack'

/**
 * What happens when back would close the app.
 *
 * The reported bug: pressing back on Home terminated the app with no warning, which
 * is Android's default at the root of a navigator and is indistinguishable from a
 * crash. Now it asks.
 *
 * The prompt is asserted rather than the registration, because the registration is
 * three lines of `BackHandler` and the *wording and destructiveness* are the part
 * that protects the user: "Stay" has to be the safe default and "Close" has to be
 * the one marked destructive, or the dialog trains people to dismiss it wrongly.
 */

describe('exitPrompt', () => {
  it('says what will happen, and why it is happening here', () => {
    const [title, message] = exitPrompt(() => undefined)

    expect(title).toBe('Close CAPRI?')
    expect(message).toContain('closes it')
  })

  it('offers staying first, and marks closing as the destructive choice', () => {
    const [, , buttons] = exitPrompt(() => undefined)
    const [stay, close] = buttons

    expect(stay.text).toBe('Stay')
    expect(stay.style).toBe('cancel')
    expect(close.text).toBe('Close')
    expect(close.style).toBe('destructive')
  })

  it('only closes when the destructive choice is taken', () => {
    let exited = false
    const [, , buttons] = exitPrompt(() => {
      exited = true
    })
    const [stay, close] = buttons

    // Nothing on the cancel path may exit — that is the whole point of the dialog.
    expect(stay).not.toHaveProperty('onPress')

    close.onPress()
    expect(exited).toBe(true)
  })
})
