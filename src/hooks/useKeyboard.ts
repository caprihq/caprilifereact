import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

/**
 * Whether the keyboard is up, and how tall it is.
 *
 * Needed because the layout has to *change shape* when the keyboard appears, not
 * merely shift: content that is vertically centred gets clipped at both ends once
 * the viewport halves, which is what put "Create account" out of reach on the
 * sign-up screen.
 *
 * iOS listens to `will*` so the layout moves with the keyboard's own animation
 * rather than snapping after it. Android has no `will*` events — `did*` is all it
 * reports — and its window is resized by `adjustResize` anyway, so height there is
 * informational.
 */
export const useKeyboard = (): { readonly visible: boolean; readonly height: number } => {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const shown = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height)
    })
    const hidden = Keyboard.addListener(hideEvent, () => {
      setHeight(0)
    })

    return () => {
      shown.remove()
      hidden.remove()
    }
  }, [])

  return { visible: height > 0, height }
}
