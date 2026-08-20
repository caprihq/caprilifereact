import { Platform } from 'react-native'
import {
  AuthorizationStatus,
  getAPNSToken,
  getMessaging,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging'
import DeviceInfo from 'react-native-device-info'
import { logWarn } from '@/utils'

/**
 * APNs device token.
 *
 * Returns the token string, or **null** when permission is denied or anything
 * goes wrong — callers treat null as "no push" and carry on, so this must
 * never throw.
 *
 * `getAPNSToken` returns the raw APNs token rather than an FCM one, which is
 * what the backend's sendPushNotification expects: it signs its own APNs
 * requests and talks to Apple directly, with no Firebase in the delivery path.
 *
 * @react-native-firebase v26 uses a modular API — free functions taking a
 * Messaging instance; the old `messaging().x()` namespaced style is gone.
 */
export const getPushToken = async (): Promise<string | null> => {
  try {
    // The simulator has no APNs token; asking for one never resolves.
    if (await DeviceInfo.isEmulator()) return null

    // Android cannot produce an APNs token, and the backend
    // (registerPushToken / sendPushNotification) speaks only APNs. Returning
    // early is honest: the alternative is requesting a notification permission
    // the app then cannot act on. Enabling Android push is a backend change —
    // an FCM token here plus an FCM sender there (§0.2).
    if (Platform.OS === 'android') return null

    const messaging = getMessaging()
    const status = await requestPermission(messaging)
    const allowed =
      status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
    if (!allowed) return null

    // Must be registered before the APNs token is available.
    await registerDeviceForRemoteMessages(messaging)
    return await getAPNSToken(messaging)
  } catch (error) {
    logWarn('[CapriPush] could not obtain a device token', error)
    return null
  }
}
