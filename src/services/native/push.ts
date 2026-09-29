import { Platform } from 'react-native'
import DeviceInfo from 'react-native-device-info'

import { capriPush } from '../../../modules/capri-push'
import { logWarn } from '@/utils'

/**
 * The device's APNs registration, as the backend needs to store it.
 *
 * Returns **null** when permission is denied or anything goes wrong — callers
 * treat null as "no push" and carry on, so this must never throw.
 *
 * **No Firebase anywhere in this path.** The backend signs its own pushes and posts
 * to Apple; the token comes from the app delegate through `CapriPush`. Reading it
 * from `@react-native-firebase/messaging` used to make the one Apple-only feature
 * in the product depend on an unrelated SDK having initialised, and when it had not,
 * registration returned nothing and no reminder was ever delivered.
 *
 * TODO(android): Android needs an FCM token instead, from
 * `@react-native-firebase/messaging`. The backend routes on `PushDevice.provider`,
 * so adding it is a token here and an `FCMProvider` there — nothing that sends
 * changes. Out of scope for this milestone.
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

    /**
     * Asked for, but not required.
     *
     * A refusal used to end this function, which meant the device was never
     * registered with the backend — and that also cut off **silent** pushes, which
     * need no permission and are how the home-screen widget stays current while the
     * app is closed. Someone who declines reminders should still get a working
     * widget. Whether reminders are *shown* is iOS's decision and the user's, and
     * `notification_enabled` gates them server-side regardless.
     *
     * iOS shows its own prompt when the app registers; nothing is requested here.
     */
    const token = await capriPush?.getToken()
    if (!token) return null

    return { token, environment: __DEV__ ? 'sandbox' : 'production' }
  } catch (error) {
    logWarn('[CapriPush] could not obtain a device token', error)
    return null
  }
}
