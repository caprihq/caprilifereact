import { useCallback, useState } from 'react'
import { useNavigation } from '@react-navigation/native'

import type { AuthNavigation } from '@/navigation/types'
import { signInWithEmail } from '../services/emailAuth'
import { useAuth } from '../model/AuthContext'
import { usePasswordReset } from './usePasswordReset'

/**
 * The sign-in form's state and its three destinations.
 *
 * Extracted when the screen crossed the 80-line limit (§3.2), which it did once
 * sign-in gained a third outcome: an account that exists but was never verified.
 *
 * Base44 answers that case with `400 "Please verify your email before logging
 * in"`, and the app used to print it as error text — leaving the user with an
 * account, no code, and no route forward, because a repeat `register` does not
 * re-send one. Now it goes to the OTP screen with `needsCode`, which makes that
 * screen request a fresh code on arrival.
 */
export const useEmailSignIn = () => {
  const navigation = useNavigation<AuthNavigation>()
  const { adoptToken } = useAuth()
  const reset = usePasswordReset()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy && !reset.busy

  const submit = useCallback(async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)

    const result = await signInWithEmail(email.trim(), password)

    if (result.kind === 'token') {
      await adoptToken(result.token)
    } else if (result.kind === 'otpRequired') {
      navigation.navigate('EmailOtp', {
        email: result.email,
        ...(result.expiresInMinutes === undefined
          ? {}
          : { expiresInMinutes: result.expiresInMinutes }),
        // A blocked sign-in sent nothing, so the screen must ask for a code.
        needsCode: result.needsCode ?? false,
      })
    } else if (result.kind === 'error') {
      setError(result.message)
    }

    setBusy(false)
  }, [adoptToken, canSubmit, email, navigation, password])

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    busy,
    canSubmit,
    submit,
    /** Forgot-password state, which the screen renders beside the form. */
    reset,
  }
}
