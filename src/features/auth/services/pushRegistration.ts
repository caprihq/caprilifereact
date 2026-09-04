import { base44 } from '@/services/api'
import { getPushRegistration } from '@/services/native'
import { logWarn } from '@/utils'

/**
 * Hand this device to the backend so it can be notified.
 *
 * The payload describes a **device**, not a user column. Tokens used to be stored
 * as `User.apns_device_token`, which the User schema never declared — Base44 drops
 * undeclared fields, so every registration was accepted and stored nothing, and no
 * notification could ever be delivered. They now go to a `PushDevice` row, which
 * also means a second phone or an iPad no longer overwrites the first.
 *
 * `environment` travels with the token because sandbox and production are separate
 * token spaces; the backend picks Apple's host per device rather than from one
 * global setting. See `PushRegistration`.
 *
 * iOS only for now — `getPushRegistration` returns null on Android, where there is
 * no APNs. The backend routes by `provider`, so adding Android is an FCM token here
 * and an `FCMProvider` there, with no change to anything that sends.
 *
 * Never throws: no push is a degraded state, not a failed sign-in.
 */
export const registerForPush = async (): Promise<boolean> => {
  try {
    const registration = await getPushRegistration()
    if (!registration) return false

    await base44.functions.invoke('registerPushToken', {
      device_token: registration.token,
      platform: 'ios',
      provider: 'apns',
      environment: registration.environment,
    })
    return true
  } catch (error) {
    logWarn('[push] could not register this device', error)
    return false
  }
}
