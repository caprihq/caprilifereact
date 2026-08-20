import { useCallback, useState } from 'react'
import { useNavigation } from '@react-navigation/native'

import type { AuthNavigation } from '@/navigation/types'
import { validateSignUp } from '../logic/passwordPolicy'
import { registerWithEmail } from '../services/emailAuth'
import { useAuth } from '../model/AuthContext'

/**
 * The registration form: state, and the flow it drives.
 *
 * Two outcomes: Base44 either hands back a token (address already verified) or
 * emails a six-digit code, in which case the OTP screen takes over.
 *
 * Base44 owns that email. It only sends it when **email and password auth is
 * enabled for app users** in the app's dashboard settings, and when the app's
 * visibility permits self-registration — without that the endpoint still answers
 * `200 "check your email"` and delivers nothing, which is exactly what it did
 * before those settings were turned on.
 */
export const useEmailSignUp = () => {
  const navigation = useNavigation<AuthNavigation>()
  const { adoptToken } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = useCallback(async () => {
    if (busy) return

    const check = validateSignUp({ email, password, confirm })
    if (check.kind === 'invalid') {
      setError(check.message)
      return
    }

    setBusy(true)
    setError(null)

    const registration = await registerWithEmail(check.email, check.password)
    setBusy(false)

    if (registration.kind === 'token') {
      // An address Base44 considers already verified — straight in.
      await adoptToken(registration.token)
      return
    }

    if (registration.kind === 'otpRequired') {
      navigation.navigate('EmailOtp', {
        email: registration.email,
        ...(registration.expiresInMinutes === undefined
          ? {}
          : { expiresInMinutes: registration.expiresInMinutes }),
      })
      return
    }

    if (registration.kind === 'error') setError(registration.message)
  }, [adoptToken, busy, confirm, email, navigation, password])

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    error,
    busy,
    submit,
  }
}
