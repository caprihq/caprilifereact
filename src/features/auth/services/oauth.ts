import InAppBrowser from 'react-native-inappbrowser-reborn'

import { base44Config, oauthCallbackUrl, oauthReturnUrl } from '@/config'
import { diag, diagFailure, diagUrl, tokenFp } from '@/utils'

/**
 * Google and Apple sign-in.
 *
 * ⚠️ This is the one place the app still hands control to a web page, and not by
 * choice: Base44 exposes Apple and Google **only** as browser redirects. Its SSO
 * module offers `getAccessToken(userId)` and `getIdToken(userId)` — GET calls that
 * *retrieve* a stored token for a user who already exists — so there is no
 * endpoint to exchange a native Google or Apple credential for a Base44 session.
 * Until Base44 adds one, a native SDK cannot sign anyone in, however nice the
 * button looks.
 *
 * How it works:
 *   1. Open Base44's provider endpoint with `from_url = <appBase>/?native_auth=1`
 *   2. The provider authenticates and returns to that URL
 *   3. The deployed page turns it into `capri://auth?access_token=…`
 *   4. `openAuth` captures that redirect and hands the token back
 *
 * `InAppBrowser.openAuth` maps onto ASWebAuthenticationSession on iOS and Chrome
 * Custom Tabs on Android, so the session cookie jar is the system one — which is
 * why an existing Google session usually completes with no typing.
 */

export type OAuthProvider = 'google' | 'apple'

export type OAuthOutcome =
  | { readonly kind: 'success'; readonly token: string }
  /** The user closed the sheet. Not a failure — the screen stays as it was. */
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string }

/** Google is Base44's default, so it has no path segment of its own. */
const providerPath = (provider: OAuthProvider): string => (provider === 'apple' ? '/apple' : '')

const loginUrlFor = (provider: OAuthProvider): string => {
  const params = new URLSearchParams({ app_id: base44Config.appId, from_url: oauthReturnUrl })
  return `${base44Config.appBaseUrl}/api/apps/auth${providerPath(provider)}/login?${params.toString()}`
}

/** Pull `access_token` out of `capri://auth?access_token=…`. */
export const extractToken = (callbackUrl: string): string | null => {
  const queryStart = callbackUrl.indexOf('?')
  if (queryStart === -1) return null
  const token = new URLSearchParams(callbackUrl.slice(queryStart + 1)).get('access_token')
  return token && token.trim() ? token : null
}

export const signInWithProvider = async (provider: OAuthProvider): Promise<OAuthOutcome> => {
  const url = loginUrlFor(provider)
  diag('oauth:start', { provider })
  diagUrl('oauth:url', url)

  try {
    if (!(await InAppBrowser.isAvailable())) {
      return { kind: 'failed', message: 'No browser is available to complete sign-in.' }
    }

    const result = await InAppBrowser.openAuth(url, oauthCallbackUrl, {
      ephemeralWebSession: false,
      showTitle: false,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
    })

    diag('oauth:sessionEnded', { type: result.type })

    if (result.type !== 'success') return { kind: 'cancelled' }

    const token = extractToken(result.url)
    if (!token) {
      // The sheet closed on our callback but carried no token — usually a
      // provider error page redirecting home.
      diagFailure('oauth:noToken', new Error('callback carried no access_token'), { provider })
      return { kind: 'failed', message: 'Sign-in did not complete. Please try again.' }
    }

    diag('oauth:token', { provider, token: tokenFp(token) })
    return { kind: 'success', token }
  } catch (error) {
    diagFailure('oauth', error, { provider })
    return { kind: 'failed', message: 'Could not complete sign-in. Please try again.' }
  }
}
