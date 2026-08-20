import { base44 } from '@/services/api'
import { describeError, diag, diagFailure, wire } from '@/utils'
import { authErrorMessage } from '../logic/authErrors'

/**
 * Password operations: request a reset, complete one, and change a password
 * while signed in.
 *
 * `resetPassword` and `changePassword` had existed in the SDK all along with
 * **nothing calling them**. A user could request a reset email and then had
 * nowhere to enter a new password — the flow simply dead-ended.
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
 * Always reports success. Telling the caller that an address is unknown lets
 * anyone probe which emails are registered, so the screen says "if that address
 * has an account…" and means it. Genuine transport failures are still surfaced,
 * because those the user can act on by retrying.
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
 * Complete a reset with the token from the email.
 *
 * Base44 signature: `resetPassword({ resetToken, newPassword })`.
 */
export const completePasswordReset = async (
  resetToken: string,
  newPassword: string,
): Promise<PasswordResult> => {
  diag('password:completeReset:start', { tokenLength: resetToken.length })
  wire('resetPassword REQUEST', {
    endpoint: 'auth.resetPassword',
    body: { resetToken, newPassword },
  })
  try {
    const response: unknown = await base44.auth.resetPassword({ resetToken, newPassword })
    wire('resetPassword RESPONSE', response)
    return { kind: 'ok' }
  } catch (error) {
    wire('resetPassword FAILED', { error: describeError(error) })
    diagFailure('password:completeReset', error)
    // 410/404 here almost always means the link was already used or has aged
    // out; authErrorMessage words both as "expired, request a new one".
    return {
      kind: 'error',
      message: authErrorMessage(error, 'Could not reset your password. Request a new link.'),
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
