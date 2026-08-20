import { base44 } from '@/services/api'
import { describeError, diag, diagFailure, wire } from '@/utils'
import { authErrorMessage, isEmailUnverified } from '../logic/authErrors'
import {
  describeResponse,
  needsOtp,
  readMessage,
  readOtpExpiryMinutes,
  readToken,
} from '../logic/authResponse'

/**
 * Email sign-in, registration and code verification — fully native, no browser.
 *
 * Unlike Apple and Google, which Base44 exposes only as browser redirects, these
 * are direct API calls, so the screens are real React Native forms.
 *
 * Every function returns a discriminated result rather than throwing, so callers
 * render a message instead of unwinding (§2.6, §5.1). Parsing lives in
 * `logic/authResponse` and error wording in `logic/authErrors`, both tested —
 * this file is only the I/O.
 *
 * Password operations live in `passwordService.ts`.
 */

export type EmailAuthResult =
  | { readonly kind: 'token'; readonly token: string }
  | {
      readonly kind: 'otpRequired'
      readonly email: string
      /** Drives the countdown, when Base44 tells us. */
      readonly expiresInMinutes?: number | undefined
      /**
       * True when no code has just been sent, so the OTP screen must request one.
       * Register mails a code itself; a blocked sign-in does not.
       */
      readonly needsCode?: boolean | undefined
    }
  | { readonly kind: 'ok' }
  | { readonly kind: 'error'; readonly message: string }

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<EmailAuthResult> => {
  diag('emailAuth:signIn:start', { email })
  wire('signIn REQUEST', { endpoint: 'auth.loginViaEmailPassword', body: { email, password } })
  try {
    const response: unknown = await base44.auth.loginViaEmailPassword(email, password)
    wire('signIn RESPONSE', response)

    if (needsOtp(response)) {
      return { kind: 'otpRequired', email, expiresInMinutes: readOtpExpiryMinutes(response) }
    }

    const token = readToken(response)
    if (!token) {
      diagFailure('emailAuth:signIn:noToken', new Error('response carried no token'), {
        ...describeResponse(response),
      })
      return { kind: 'error', message: 'Sign in succeeded but returned no session.' }
    }

    diag('emailAuth:signIn:ok')
    return { kind: 'token', token }
  } catch (error) {
    wire('signIn FAILED', { email, error: describeError(error) })
    diagFailure('emailAuth:signIn', error, { email })

    // Registered but never verified. The account is real and the password may well
    // be right — what is missing is the code, so send one and go to the screen that
    // takes it. Base44 does not re-send on a repeat `register`, which is how these
    // users got stuck with no way to ask for a code at all.
    if (isEmailUnverified(error)) {
      diag('emailAuth:signIn:unverified', {
        decision: 'account exists but is unverified → requesting a code and showing the OTP screen',
      })
      return { kind: 'otpRequired', email, needsCode: true }
    }

    return { kind: 'error', message: authErrorMessage(error, 'Could not sign in.') }
  }
}

/**
 * Base44's RegisterParams accepts only { email, password, turnstile_token?,
 * referral_code? } — there is no name field. A display name is set after the
 * session exists, via auth.updateMe().
 */
export const registerWithEmail = async (
  email: string,
  password: string,
): Promise<EmailAuthResult> => {
  diag('emailAuth:register:start', { email })
  // POST /api/apps/{appId}/auth/register — exactly what Base44 receives.
  wire('register REQUEST', { endpoint: 'auth.register', body: { email, password } })
  try {
    const response: unknown = await base44.auth.register({ email, password })
    // The whole body. Base44 says what it did in `message`; whether it emailed a
    // code at all is not something the app can otherwise see.
    wire('register RESPONSE', response)

    const token = readToken(response)
    if (token) {
      diag('emailAuth:register:ok', { decision: 'token returned — signed in immediately' })
      return { kind: 'token', token }
    }

    // `register` emails the code itself — verified with a plain HTTPS call to this
    // endpoint, no browser headers, which delivered. So nothing is requested here.
    //
    // An explicit `resendOtp` was tried while diagnosing and is deliberately gone:
    // it issues a *second* code and invalidates the one register just sent, so the
    // user gets two emails and the first is dead. The web client does not do it
    // either — resend belongs on the user's Resend tap, and nowhere else.
    const expiresInMinutes = readOtpExpiryMinutes(response)
    diag('emailAuth:register:decision', {
      decision: 'account created, no token → Base44 has emailed the code; showing the OTP screen',
      otpExpiryMinutes: expiresInMinutes ?? '(absent)',
      base44Message: readMessage(response) ?? '(none)',
    })

    return { kind: 'otpRequired', email, expiresInMinutes }
  } catch (error) {
    wire('register FAILED', { email, error: describeError(error) })
    diagFailure('emailAuth:register', error, { email })
    return { kind: 'error', message: authErrorMessage(error, 'Could not create your account.') }
  }
}

export const verifyEmailOtp = async (email: string, code: string): Promise<EmailAuthResult> => {
  diag('emailAuth:verifyOtp:start', { email, codeLength: code.length })
  // The code is shown deliberately: it is short-lived, single-use, and being
  // unable to see what was submitted is what makes this flow undebuggable.
  wire('verifyOtp REQUEST', { endpoint: 'auth.verifyOtp', body: { email, otpCode: code } })
  try {
    const response: unknown = await base44.auth.verifyOtp({ email, otpCode: code })
    wire('verifyOtp RESPONSE', response)

    const token = readToken(response)
    if (!token) {
      diagFailure('emailAuth:verifyOtp:noToken', new Error('response carried no token'), {
        ...describeResponse(response),
      })
      return { kind: 'error', message: 'That code did not complete sign in.' }
    }
    return { kind: 'token', token }
  } catch (error) {
    wire('verifyOtp FAILED', { email, error: describeError(error) })
    diagFailure('emailAuth:verifyOtp', error, { email })
    return { kind: 'error', message: authErrorMessage(error, 'That code was not accepted.') }
  }
}

export const resendEmailOtp = async (email: string): Promise<EmailAuthResult> => {
  diag('emailAuth:resendOtp:start', { email })
  wire('resendOtp REQUEST', { endpoint: 'auth.resendOtp', body: { email } })
  try {
    const response: unknown = await base44.auth.resendOtp(email)
    wire('resendOtp RESPONSE', response)
    return { kind: 'ok' }
  } catch (error) {
    wire('resendOtp FAILED', { email, error: describeError(error) })
    diagFailure('emailAuth:resendOtp', error, { email })
    return { kind: 'error', message: authErrorMessage(error, 'Could not resend the code.') }
  }
}
