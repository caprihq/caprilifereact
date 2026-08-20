/**
 * Base44 connection settings.
 *
 * Plain constants rather than a runtime config lookup. Bare React Native has
 * no equivalent of expo-constants' `extra` block, and these values are not
 * secret — the app id and base URL are both visible in the shipped web client
 * already. Keeping them here means no native plumbing and no chance of a
 * missing-config crash at launch.
 *
 * ⚠️ `bundleId` is mirrored in ios/CAPRI/Info.plist. A test
 * (src/config/configConstants.test.ts) fails if it drifts.
 *
 * ⚠️ `authCallbackScheme` is mirrored in ios/CAPRI/Info.plist and
 * AndroidManifest.xml, and `configConstants.test.ts` fails if they drift.
 *
 * It exists for Google and Apple only. Base44's provider login cannot redirect to
 * a custom scheme, so it returns to `?native_auth=1` on Base44's own domain and the
 * deployed page turns that into `capri://auth?access_token=…`. Email sign-in needs
 * none of this — it is a direct API call.
 */

type Base44Config = {
  readonly appId: string
  readonly appBaseUrl: string
  readonly authCallbackScheme: string
}

// Confirmed against the live backend: the public-settings endpoint echoes
// this id back in extra_data.app_id.
export const base44Config: Base44Config = {
  appId: '69aa4c4d4f33993320ae7f08',
  appBaseUrl: 'https://capriforlifev1.base44.app',
  authCallbackScheme: 'capri',
}

/** Where Base44's provider login sends the browser back to. */
export const oauthReturnUrl = `${base44Config.appBaseUrl}/?native_auth=1`

/** The custom scheme the auth session watches for. */
export const oauthCallbackUrl = `${base44Config.authCallbackScheme}://auth`
