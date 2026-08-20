import { base44 } from '@/services/api'
import { getPushToken } from '@/services/native'
import { logWarn } from '@/utils'

/**
 * Hand the device's push token to the backend.
 *
 * This was the missing half of push: `getPushToken` existed and was never
 * called by anything, and `base44/functions/registerPushToken` was never
 * invoked — so the server never learned any device token and no notification
 * could ever be delivered, on any platform.
 *
 * The backend stores it via `auth.updateMe({ apns_device_token })` and
 * `sendPushNotification` signs its own APNs requests, so this is the whole
 * client side of the contract.
 *
 * ⚠️ iOS ONLY, by backend design. `registerPushToken` accepts exactly
 * `{ apns_device_token }` and the delivery path talks to Apple directly. Android
 * needs an FCM token and an FCM sender in the backend — a deliberate change in
 * `base44/`, not something to bolt on here (guidelines §0.2).
 *
 * Never throws: no push is a degraded state, not a failed sign-in.
 */
export const registerForPush = async (): Promise<boolean> => {
  try {
    const token = await getPushToken()
    if (!token) return false

    await base44.functions.invoke('registerPushToken', { apns_device_token: token })
    return true
  } catch (error) {
    logWarn('[push] could not register the device token', error)
    return false
  }
}
