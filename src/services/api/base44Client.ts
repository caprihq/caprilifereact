import { createClient } from '@base44/sdk'

import { base44Config } from '@/config'

/**
 * The single Base44 client for the app.
 *
 * The SDK is used directly rather than reimplementing its REST surface: the
 * module loads and the client constructs with no browser globals present.
 *
 * ⚠️ It does NOT run on Hermes unadorned. The SDK stamps every request with
 * `uuidv4()`, and uuid v13 needs `crypto.getRandomValues()`, which Hermes lacks
 * — so every call throws until `react-native-get-random-values` is imported.
 * That polyfill is the first import in index.js and must stay there.
 *
 * An earlier note here claimed this was "verified from a DOM-free runtime". That
 * check ran under Node, which ships WebCrypto; it said nothing about Hermes, and
 * the missing polyfill went unnoticed until the first real API call.
 *
 * `requiresAuth: false` means "do not redirect on 401" — the RN app routes
 * unauthenticated users itself. It does not mean requests are anonymous.
 */
export const base44 = createClient({
  appId: base44Config.appId,
  serverUrl: base44Config.appBaseUrl,
  appBaseUrl: base44Config.appBaseUrl,
  requiresAuth: false,
})

/**
 * Point the client at a session token (or clear it).
 *
 * Every authenticated call reads the token the SDK holds in memory, so this
 * must run before any entity access — on launch after a Keychain read, and
 * immediately after a successful login.
 */
export const applyToken = (token: string | null): void => {
  // saveToStorage=false: the SDK's persistence path targets web storage, which
  // does not exist here. The Keychain is this app's durable store, so the SDK
  // only ever holds the in-memory copy.
  //
  // ⚠️ Passing null to clear the session depends on `patches/@base44+sdk+0.8.41.patch`.
  // Upstream's `setToken` returns early on a falsy token, so un-authenticating
  // was a silent no-op: the bearer header stayed on both axios clients, and
  // `logout()` only ever cleared one of them. `sdkAuthHeaders.test.ts` guards it.
  base44.auth.setToken(token ?? '', false)
}

/** HTTP status from an SDK error, when the failure reached the server. */
export const httpStatusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = error as { status?: unknown; response?: { status?: unknown } }
  if (typeof candidate.status === 'number') return candidate.status
  if (typeof candidate.response?.status === 'number') return candidate.response.status
  return undefined
}

/** True when the server rejected the credentials, as opposed to a network blip. */
export const isAuthFailure = (error: unknown): boolean => {
  const status = httpStatusOf(error)
  return status === 401 || status === 403
}
