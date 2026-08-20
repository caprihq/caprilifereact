import { applyToken, base44, clearQueryCache, isAuthFailure } from '@/services/api'
import { keychainSecretStore } from '@/services/storage'
import { mmkvPrefStore } from '@/services/storage'
import { PREF_KEYS, SECRET_KEYS } from '@/services/storage'
import { parseToken } from '@/features/auth/logic/token'
import { describeError, diag, diagFailure, logWarn, tokenFp, wire } from '@/utils'
import type { User } from '@/types/entities'

/**
 * Every way a session can begin or end, in one place.
 *
 * Token lifecycle: Keychain is the durable store, the SDK holds the in-memory
 * copy. `persistSession` is the only writer, so the two can never drift.
 */

export type AuthResult =
  | { readonly kind: 'authenticated'; readonly user: User }
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'error'; readonly message: string }

/** Store the token in the Keychain, hand it to the SDK, remember the provider. */
export const persistSession = async (token: string): Promise<void> => {
  await keychainSecretStore.set(SECRET_KEYS.accessToken, token)
  applyToken(token)
  mmkvPrefStore.setBoolean(PREF_KEYS.hadSession, true)

  const provider = parseToken(token)?.provider
  if (provider) mmkvPrefStore.setString(PREF_KEYS.loginProvider, provider)
}

export type SessionEndReason =
  /** The user asked to leave. Nothing may sign them back in silently. */
  | 'signedOut'
  /**
   * The server refused the token — expired or revoked. The provider session
   * behind it may well still be alive, so this device stays resumable.
   */
  | 'rejected'

/**
 * End the session and remove every trace of it.
 *
 * The single teardown point: sign-out and a rejected session (401/403) both come
 * through here, so anything forgotten is forgotten on both paths. The one thing
 * they must NOT share is auto-resume.
 *
 * `signedOut` clears `hadSession` and `loginProvider`, because a user who asked to
 * leave should not be signed back in by anything.
 *
 * `rejected` keeps both, now only as a record: this device has signed in before,
 * and with which provider. Nothing acts on it today — the silent auto-resume it
 * used to feed was a browser behaviour and went with the browser. It is kept
 * because it is a true fact worth having in diagnostics, and because a native
 * Apple or Google SDK would want exactly this to offer a one-tap return.
 *
 * `refreshUnsupportedAt` survives either way — it is a fact about the backend, not
 * about whoever was signed in.
 */
export const clearSession = async (reason: SessionEndReason): Promise<void> => {
  diag('auth:clearSession', { reason })
  await keychainSecretStore.remove(SECRET_KEYS.accessToken)
  applyToken(null)

  if (reason === 'signedOut') {
    mmkvPrefStore.remove(PREF_KEYS.hadSession)
    mmkvPrefStore.remove(PREF_KEYS.loginProvider)
  }

  // Cached tasks, commitments and the user record belong to the session that
  // fetched them. Left behind, the next person to sign in on this device starts
  // out looking at the previous user's data until each query refetches.
  await clearQueryCache()
}

/** The token currently in the Keychain, if any. */
export const readStoredToken = (): Promise<string | null> =>
  keychainSecretStore.get(SECRET_KEYS.accessToken)

/** True when this device has signed in before — drives auto-resume on the login screen. */
export const hadPreviousSession = (): boolean =>
  mmkvPrefStore.getBoolean(PREF_KEYS.hadSession) === true

export const knownProvider = (): string | undefined =>
  mmkvPrefStore.getString(PREF_KEYS.loginProvider)

/**
 * Confirm the SDK's current token against the server and return the user.
 *
 * A 401/403 means the credentials are genuinely bad, so the session is wiped.
 * Anything else (offline, 5xx) is reported as an error WITHOUT clearing the
 * token — a flaky network must never sign someone out.
 */
export const verifyCurrentSession = async (): Promise<AuthResult> => {
  diag('auth:verify:start')
  wire('me REQUEST', { endpoint: 'auth.me', body: '(no body — bearer token only)' })
  try {
    const user = (await base44.auth.me()) as User
    wire('me RESPONSE', user)
    diag('auth:verify:ok', { userId: user.id, email: user.email, plan: user.plan ?? 'free' })
    return { kind: 'authenticated', user }
  } catch (error) {
    wire('me FAILED', { error: describeError(error) })
    if (isAuthFailure(error)) {
      diagFailure('auth:verify:rejected', error)
      await clearSession('rejected')
      return { kind: 'unauthenticated' }
    }
    const message =
      error instanceof Error ? error.message : 'Could not reach CAPRI. Check your connection.'
    diagFailure('auth:verify', error)
    return { kind: 'error', message }
  }
}

/**
 * Launch path: Keychain → SDK → verify.
 *
 * Local expiry is not pre-checked. The server is the authority, and a token
 * whose claims we cannot read is still worth presenting — the same reasoning
 * that made the web client's me()-verify removal a bug fix.
 */
export const restoreSession = async (): Promise<AuthResult> => {
  const token = await readStoredToken()
  diag('auth:restore', {
    token: tokenFp(token),
    hadPreviousSession: hadPreviousSession(),
    provider: knownProvider() ?? '(none)',
    expiresAt: parseToken(token)?.expiresAt ?? null,
  })

  if (!token) return { kind: 'unauthenticated' }
  applyToken(token)
  return verifyCurrentSession()
}

/**
 * Adopt a token the app obtained itself — today only from an email sign-in.
 *
 * Kept as the single entry point for "here is a token, make it the session" so a
 * future native Apple or Google SDK has one place to hand its token to.
 */
export const adoptSessionToken = async (token: string): Promise<AuthResult> => {
  diag('auth:adoptToken', { token: tokenFp(token) })
  await persistSession(token)
  return verifyCurrentSession()
}

export const signOut = async (): Promise<void> => {
  try {
    // This **throws** here, and the catch is load-bearing rather than defensive:
    // the SDK's logout is a browser routine that ends by assigning
    // `window.location.href`, which React Native has no equivalent of. It clears
    // the entities client's header before reaching that line and never touches
    // the functions client at all — so `clearSession` → `applyToken(null)` is
    // what actually un-authenticates the app. Proved in sdkAuthHeaders.test.ts.
    //
    // Called with no argument on purpose: the redirectUrl overload is a web
    // navigation that means nothing here.
    base44.auth.logout()
  } catch (error) {
    // Best-effort; the local session must always clear.
    logWarn('[auth] SDK logout threw, clearing locally anyway', error)
  }
  await clearSession('signedOut')
}
