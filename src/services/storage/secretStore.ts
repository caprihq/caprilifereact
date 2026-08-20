import * as Keychain from 'react-native-keychain'

import { diag, logWarn } from '@/utils'
import type { SecretStore } from './keys'
import { keychainServiceFor } from './keys'

/**
 * The app's only secret store: iOS Keychain, Android Keystore
 * (react-native-keychain). Nothing else may import that library — an ESLint rule
 * enforces it, so "centralised" is a property of the build, not a convention.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` is deliberate: the session token should not
 * ride an iCloud Keychain backup onto another device, and nothing needs to
 * read it while the phone is locked — silent restore runs after unlock, on
 * app foreground.
 *
 * ⚠️ That last clause is the one to revisit when the widget ships. A WidgetKit
 * timeline can refresh while the device is locked, and this accessibility makes
 * the read fail there — the widget must render its last-known content rather
 * than treat the failure as "signed out". Loosening it to
 * `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` would fix widget freshness at the cost
 * of the token being readable whenever the device has been unlocked once. The
 * stricter option is the right default until a widget actually needs otherwise.
 *
 * No `accessGroup` is passed: the real group name needs the team prefix, which
 * JS cannot know. iOS files items under the first group in the entitlements
 * instead — see `KEYCHAIN_ACCESS_GROUP` in `keys.ts`.
 *
 * Keychain entries are per-service, so each key gets its own service name.
 * The username slot is unused; only the password carries data.
 */

/**
 * Android storage, named rather than inherited.
 *
 * `accessible` is iOS-only, so without this Android silently took whatever "best
 * available" resolved to — for a store holding the session, that is worth stating.
 * AES-GCM in the Keystore, *without* the biometric variants: `AES_GCM` and `RSA`
 * prompt the user on every read, which would break silent restore at launch.
 *
 * `securityLevel` is deliberately not set. It is a minimum requirement, and
 * demanding SECURE_HARDWARE fails outright on devices and emulators without a
 * TEE — better to take what the device offers and record it (below) than to
 * refuse to store a session at all.
 *
 * Ignored on iOS: options are passed straight to the native module, which reads
 * only the keys it knows.
 */
const ANDROID_STORAGE = Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH

const readOptionsFor = (key: string): Keychain.GetOptions => ({
  service: keychainServiceFor(key),
})

const writeOptionsFor = (key: string): Keychain.SetOptions => ({
  service: keychainServiceFor(key),
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  storage: ANDROID_STORAGE,
})

export const keychainSecretStore: SecretStore = {
  get: async (key) => {
    try {
      const result = await Keychain.getGenericPassword(readOptionsFor(key))
      return result === false ? null : result.password
    } catch (error) {
      // A corrupt or inaccessible entry must read as "no session" rather than
      // crash the launch path. Never swallow it silently (guidelines §5.1).
      logWarn('[secretStore] read failed', { key, error })
      return null
    }
  },

  set: async (key, value) => {
    // Username is required by the API but unused; the key name doubles as it.
    const result = await Keychain.setGenericPassword(key, value, writeOptionsFor(key))
    // What the device actually gave us, which is not knowable up front: a device
    // without hardware-backed keys silently gets a weaker store, and this is the
    // only place that fact is observable. Never the value — only where it went.
    diag('secretStore:stored', {
      key,
      storage: result === false ? '(unreported)' : result.storage,
    })
  },

  remove: async (key) => {
    try {
      await Keychain.resetGenericPassword(readOptionsFor(key))
    } catch (error) {
      // Deleting something already absent is not worth propagating —
      // sign-out must always complete.
      logWarn('[secretStore] delete failed', { key, error })
    }
  },
}
