/**
 * Storage seams.
 *
 * Two distinct stores, deliberately not one:
 *
 *   SecretStore — iOS Keychain. Session tokens only. Async, because the
 *                 Keychain is. Survives app reinstall unless told otherwise.
 *   PrefStore   — MMKV. Non-secret preferences. Synchronous, so it can be read
 *                 during render and inside pure helpers without turning every
 *                 caller into a promise (guidelines §4.4).
 *
 * Both are interfaces so tests can substitute in-memory doubles and never
 * touch a device API.
 */

export type SecretStore = {
  readonly get: (key: string) => Promise<string | null>
  readonly set: (key: string, value: string) => Promise<void>
  readonly remove: (key: string) => Promise<void>
}

export type PrefStore = {
  readonly getString: (key: string) => string | undefined
  readonly setString: (key: string, value: string) => void
  readonly getBoolean: (key: string) => boolean | undefined
  readonly setBoolean: (key: string, value: boolean) => void
  readonly remove: (key: string) => void
}

/** Keychain keys. Namespaced so a future migration can find them. */
export const SECRET_KEYS = {
  accessToken: 'capri.auth.accessToken',
} as const

/**
 * Keychain service name for a secret. Entries are per-service, so this is the
 * identifier the widget extension must query for to find the same item.
 *
 * Exported rather than inlined in `secretStore` so there is exactly one
 * definition for both the writer and any reader outside JS.
 */
export const keychainServiceFor = (key: string): string => `com.capri.${key}`

/**
 * Keychain access group shared with the widget extension.
 *
 * The real group is this string prefixed with the team id —
 * `keychain-access-groups` in `ios/CAPRI/CAPRI.entitlements` writes it as
 * `$(AppIdentifierPrefix)…`, which Xcode expands at build time. JS cannot know
 * the team prefix, so nothing passes `accessGroup` at runtime: iOS files items
 * under the first group in the entitlements, which is why that array holds
 * exactly one entry. `configConstants.test.ts` guards the two against drift.
 */
export const KEYCHAIN_ACCESS_GROUP = 'com.base69aa4c4d4f33993320ae7f08.app.shared'

/** MMKV keys. */
export const PREF_KEYS = {
  hadSession: 'capri.auth.hadSession',
  loginProvider: 'capri.auth.loginProvider',
  /** When the refresh endpoint last answered "no such thing". Re-probed weekly. */
  refreshUnsupportedAt: 'capri.auth.refreshUnsupportedAt',
  themeName: 'capri.ui.theme',
  darkMode: 'capri.ui.darkMode',
} as const
