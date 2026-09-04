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
 * The device's APNs registration, as the backend needs to store it.
 *
 * Returns **null** when permission is denied or anything goes wrong — callers
 * treat null as "no push" and carry on, so this must never throw.
 *
 * `getAPNSToken` gives the raw Apple token rather than an FCM one. Firebase is
 * only the plumbing that asks iOS for it: nothing in the delivery path touches
 * Firebase, and the backend posts straight to Apple.
 *
 * @react-native-firebase v26 uses a modular API — free functions taking a
 * Messaging instance; the old `messaging().x()` namespaced style is gone.
 */

export type PushRegistration = {
  readonly token: string
  /**
   * Which APNs host this token is valid on, and the reason the backend no longer
   * has a global `APNS_USE_PRODUCTION` switch.
   *
   * Sandbox and production are separate token spaces: a token issued to a build
   * signed with `aps-environment: development` is meaningless on Apple's
   * production host, and Apple answers `BadDeviceToken` for every push. One
   * server-side switch is therefore wrong for half the fleet as soon as a
   * TestFlight build and an Xcode build both exist, so the device says which it is.
   *
   * The mapping is the entitlement each build config signs with: Debug carries
   * `CAPRI.entitlements` (development → sandbox), Release carries
   * `CAPRIRelease.entitlements` (production). `__DEV__` distinguishes them, and
   * TestFlight — which is production, a common mix-up — falls on the right side.
   */
  readonly environment: 'sandbox' | 'production'
}

export const getPushRegistration = async (): Promise<PushRegistration | null> => {
  try {
    // The simulator has no APNs token; asking for one never resolves.
    if (await DeviceInfo.isEmulator()) return null

    // Android cannot produce an APNs token. The backend routes by provider, so
    // Android support is an `FCMProvider` there plus an FCM token here — not
    // something to fake from this function (§0.2).
    if (Platform.OS === 'android') return null

    const messaging = getMessaging()
    const status = await requestPermission(messaging)
    const allowed =
      status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
    if (!allowed) return null

    // Must be registered before the APNs token is available.
    await registerDeviceForRemoteMessages(messaging)
    const token = await getAPNSToken(messaging)
    if (!token) return null

    return { token, environment: __DEV__ ? 'sandbox' : 'production' }
  } catch (error) {
    logWarn('[CapriPush] could not obtain a device token', error)
    return null
  }
}
