import { base44 } from '@/services/api'
import { describeError, diag, diagFailure, wire } from '@/utils'
import { authErrorMessage } from '../logic/authErrors'

/**
 * Password operations: request a reset email, and change a password while signed in.
 *
 * Completing a reset is here again. It was dropped on the belief that the token
 * could never reach the app — the email links to `capriforlifev1.base44.app`, which
 * looked unclaimable. It is not: Base44 already serves
 * `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` for
 * this exact bundle id, so the app can claim those links and receive the token
 * directly. See `navigation/linking.ts`.
 *
 * Split from `emailAuth.ts`, which was already seven functions and close to the
 * 200-line limit (§3.2).
 */

export type PasswordResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'error'; readonly message: string }

/**
 * Ask Base44 to email a reset link.
 *
 * **Cannot report whether the account exists**, and that is the server's decision,
 * not a hedge invented here. `/auth/reset-password-request` answers identically for
 * a registered address and a made-up one:
 *
 *     200 {"message":"If an account exists with this email, you will receive
 *          a password reset link."}
 *
 * Verified against the live backend with both. Anything more definite on screen
 * would be a guess — and confirming that an address is registered is exactly what
 * lets someone test a list of emails against the service.
 *
 * Genuine transport failures are still surfaced, because those a user can act on
 * by retrying.
 */
export const requestPasswordReset = async (email: string): Promise<PasswordResult> => {
  diag('password:requestReset:start', { email })
  wire('resetPasswordRequest REQUEST', { endpoint: 'auth.resetPasswordRequest', body: { email } })
  try {
    const response: unknown = await base44.auth.resetPasswordRequest(email)
    // Whether Base44 says it sent a link, and what it calls the token, decides
    // how the reset screen must be reached — the open question in phase 4.
    wire('resetPasswordRequest RESPONSE', response)
    // Logged on success too: without this the diagnostics showed a `:start` and
    // then silence, so a completed request was indistinguishable from a hung one.
    diag('password:requestReset:ok', { email })
    return { kind: 'ok' }
  } catch (error) {
    wire('resetPasswordRequest FAILED', { email, error: describeError(error) })
    diagFailure('password:requestReset', error, { email })

    // A 404 here means "no such account", which is exactly what must not be
    // disclosed. Report success and let the generic copy stand.
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 404) return { kind: 'ok' }

    return { kind: 'error', message: authErrorMessage(error, 'Could not send a reset email.') }
  }
}

/**
 * Complete a reset with the token from the email link.
 *
 * Base44 signature: `resetPassword({ resetToken, newPassword })`. It answers every
 * rejection with the same 400 — "Invalid or expired reset token" — whether the token
 * is wrong, already spent, superseded by a newer request, or genuinely old, so the
 * message here has to cover all four without pretending to know which.
 */
export const completePasswordReset = async (
  resetToken: string,
  newPassword: string,
): Promise<PasswordResult> => {
  diag('password:completeReset:start', { tokenLength: resetToken.length })
  wire('resetPassword REQUEST', { endpoint: 'auth.resetPassword', body: { resetToken, newPassword } })
  try {
    const response: unknown = await base44.auth.resetPassword({ resetToken, newPassword })
    wire('resetPassword RESPONSE', response)
    return { kind: 'ok' }
  } catch (error) {
    wire('resetPassword FAILED', { error: describeError(error) })
    diagFailure('password:completeReset', error)
    return {
      kind: 'error',
      message: authErrorMessage(
        error,
        'That link is no longer valid. Reset links work once, and a newer request cancels the last one.',
      ),
    }
  }
}

/**
 * Change the password of the signed-in user.
 *
 * Base44 signature: `changePassword({ userId, currentPassword, newPassword })`.
 * The user id is required, so the caller passes the one React Query already
 * holds rather than this module re-fetching `auth.me()`.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<PasswordResult> => {
  diag('password:change:start', { userId })
  wire('changePassword REQUEST', {
    endpoint: 'auth.changePassword',
    body: { userId, currentPassword, newPassword },
  })
  try {
    const response: unknown = await base44.auth.changePassword({
      userId,
      currentPassword,
      newPassword,
    })
    wire('changePassword RESPONSE', response)
    return { kind: 'ok' }
  } catch (error) {
    wire('changePassword FAILED', { userId, error: describeError(error) })
    diagFailure('password:change', error, { userId })
    // A 401/403 here is a wrong *current* password, not a bad session, so the
    // generic "incorrect email or password" would mislead.
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 401 || status === 403) {
      return { kind: 'error', message: 'That current password is not correct.' }
    }
    return { kind: 'error', message: authErrorMessage(error, 'Could not change your password.') }
  }
}
