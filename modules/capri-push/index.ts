import { NativeModules } from 'react-native'

/**
 * The device's APNs token, from iOS directly.
 *
 * No Firebase. CAPRI signs its own pushes with a `.p8` and posts to Apple, so the
 * one Apple-only part of the product should not depend on an unrelated SDK having
 * initialised — which is exactly how it failed before: the token request returned
 * nothing and no reminder could be delivered.
 *
 * Absent until the app has been rebuilt after `pod install`; callers degrade rather
 * than crashing at import time.
 */
type CapriPushModule = {
  /**
   * Resolves with the token, or null if registration failed or took too long.
   *
   * Waits for the delegate callback rather than answering immediately — the token
   * usually lands within a second of launch, and JavaScript often asks first.
   */
  getToken: () => Promise<string | null>
}

const nativeModule = (NativeModules as Record<string, unknown>).CapriPush as
  | CapriPushModule
  | undefined

export const capriPush = nativeModule
