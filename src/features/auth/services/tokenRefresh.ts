import { base44Config } from '@/config'
import { isBetterToken } from '@/features/auth/logic/refreshPolicy'
import { tokenFingerprint } from '@/features/auth/logic/token'
import { mmkvPrefStore } from '@/services/storage'
import { PREF_KEYS } from '@/services/storage'
import { persistSession, readStoredToken } from './authService'
import { logWarn } from '@/utils'

/**
 * Silent session renewal.
 *
 * Base44 issues a single short-lived JWT and its SDK exposes no refresh call.
 * There is an undocumented `GET /api/apps/{appId}/auth/token` that answers with
 * proper JSON auth errors, so it is probed — but the response is validated hard
 * before anything is adopted, and a negative answer is remembered so the app
 * stops asking (re-probed weekly, in case Base44 ships it later).
 *
 * The decision of *whether* to run is in lib/auth/refreshPolicy (pure, tested);
 * this module only performs the request and classifies the reply.
 */

export type RefreshResult =
  /** A strictly better token was adopted. */
  | { readonly kind: 'renewed' }
  /** The endpoint does not issue tokens. Do not keep asking. */
  | { readonly kind: 'unsupported' }
  /** The server rejected the credential — treat as a dead session. */
  | { readonly kind: 'rejected' }
  /** Transient: offline, 5xx, or nothing better on offer. Try again later. */
  | { readonly kind: 'retry' }

const markUnsupported = (nowMs: number): void => {
  mmkvPrefStore.setString(PREF_KEYS.refreshUnsupportedAt, String(nowMs))
}

export const unsupportedSinceMs = (): number | undefined => {
  const raw = mmkvPrefStore.getString(PREF_KEYS.refreshUnsupportedAt)
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

export const clearUnsupportedFlag = (): void => {
  mmkvPrefStore.remove(PREF_KEYS.refreshUnsupportedAt)
}

/** The token from a response body, whatever shape it arrives in. */
const readCandidate = (body: unknown): string | null => {
  if (typeof body === 'string' && body) return body
  if (typeof body !== 'object' || body === null) return null
  const record = body as Record<string, unknown>
  for (const key of ['access_token', 'token', 'accessToken']) {
    const value = record[key]
    if (typeof value === 'string' && value) return value
  }
  return null
}

export const refreshSessionToken = async (nowMs: number): Promise<RefreshResult> => {
  const current = await readStoredToken()
  if (!current) return { kind: 'retry' }

  try {
    const response = await fetch(
      `${base44Config.appBaseUrl}/api/apps/${base44Config.appId}/auth/token`,
      {
        headers: {
          Authorization: `Bearer ${current}`,
          Accept: 'application/json',
          'X-App-Id': base44Config.appId,
        },
      },
    )

    if (response.status === 404 || response.status === 405) {
      markUnsupported(nowMs)
      return { kind: 'unsupported' }
    }

    // exp said the token was alive, but the server disagrees — revoked, or
    // clock skew. Same handling as a genuine expiry.
    if (response.status === 401 || response.status === 403) return { kind: 'rejected' }

    // Base44 serves an HTML 200 from its SPA catch-all for unknown paths, which
    // also means "no such API here".
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('json')) {
      markUnsupported(nowMs)
      return { kind: 'unsupported' }
    }

    const candidate = readCandidate((await response.json()) as unknown)
    if (!isBetterToken(candidate, current) || candidate === null) {
      // Answered, but with nothing better. Not an error, just not a refresh.
      markUnsupported(nowMs)
      return { kind: 'unsupported' }
    }

    // persistSession is the only writer of the token, so the Keychain, the SDK
    // and the widget stay in step.
    await persistSession(candidate)
    logWarn('[tokenRefresh] adopted a renewed token', tokenFingerprint(candidate))
    return { kind: 'renewed' }
  } catch (error) {
    // Network blip. The watchdog will come back.
    logWarn('[tokenRefresh] attempt failed', error)
    return { kind: 'retry' }
  }
}
