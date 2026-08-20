import { useCallback } from 'react'
import { Alert, BackHandler, Platform } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

/**
 * Android's hardware back button, for the screens where the default is wrong.
 *
 * Inside a stack, React Navigation already does the right thing: back pops. At the
 * *root* it does not pop — there is nothing to pop to — so Android finishes the
 * activity and the app disappears. On the Home tab that is indistinguishable from a
 * crash, and it was being read as one.
 *
 * A handler returning `true` means "consumed, do not exit". Registration is tied to
 * focus rather than mount, because both tab screens stay mounted: without
 * `useFocusEffect` the Home screen's handler would still be answering while Profile
 * is on screen, and whichever registered last would win.
 *
 * iOS has no hardware back, so this is a no-op there.
 */
export const useHardwareBack = (handler: () => boolean): void => {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined

      const subscription = BackHandler.addEventListener('hardwareBackPress', handler)
      return () => subscription.remove()
    }, [handler]),
  )
}

/**
 * The confirmation shown when back would close the app.
 *
 * Pure and exported so the wording and the buttons can be asserted without a
 * renderer — and so it is obvious that "Close" is the destructive one. Losing an
 * unsaved capture to a stray back press is the thing being prevented.
 */
export const exitPrompt = (onExit: () => void) =>
  [
    'Close CAPRI?',
    'You are at the start of the app, so going back closes it.',
    [
      { text: 'Stay', style: 'cancel' as const },
      { text: 'Close', style: 'destructive' as const, onPress: onExit },
    ],
  ] as const

/**
 * Back on a root screen asks first instead of killing the app.
 *
 * Chosen over the "press back twice to exit" toast because a dialog states the
 * consequence and cannot be missed — a toast that appears for two seconds is easy to
 * miss twice in a row, which is how the accidental exits happen in the first place.
 */
export const useConfirmExit = (): void => {
  useHardwareBack(
    useCallback(() => {
      const [title, message, buttons] = exitPrompt(() => BackHandler.exitApp())
      Alert.alert(title, message, [...buttons])

      return true
    }, []),
  )
}
