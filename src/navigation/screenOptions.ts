import { Platform } from 'react-native'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

/**
 * Shared native-stack behaviour.
 *
 * `AppStack` previously declared no options at all — the signed-in stack, where
 * users spend all their time, ran on defaults while the sign-in stack was fully
 * configured. These make the gestures explicit and identical in both.
 */

/** Interactive back, from anywhere on the screen rather than only its edge. */
export const gestureOptions: NativeStackNavigationOptions = {
  gestureEnabled: true,
  // iOS only. On Android the system back gesture already covers the screen, and
  // setting this there is ignored.
  ...(Platform.OS === 'ios' ? { fullScreenGestureEnabled: true } : {}),
}

/** A push. The platform default, stated explicitly so it cannot drift. */
export const pushAnimation: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
}

/**
 * A genuine UIKit sheet: system grabber, drag-to-dismiss, and the card behind it
 * scaled back. Removes any need for a bottom-sheet library.
 */
export const sheetOptions: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  gestureEnabled: true,
}
