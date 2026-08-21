import { useCallback, useState } from 'react'

import { validateNewPassword } from '../logic/passwordPolicy'
import { completePasswordReset } from '../services/passwordService'

/**
 * Form state for setting a new password from a reset link.
 *
 * Extracted so the screen stays inside the 80-line body limit (§3.2), matching
 * `useChangePassword` — the two are siblings and should read alike.
 *
 * The token is not validated here beyond being present. Only Base44 can say whether
 * it is still good, and it will not say *why* it is not: wrong, already spent,
 * superseded, and aged out all come back as the same 400.
 */
export const useCompleteReset = (token: string, onDone: () => void) => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = useCallback(async () => {
    if (busy) return

    const check = validateNewPassword(password, confirm)
    if (check.kind === 'invalid') {
      setError(check.message)
      return
    }

    setBusy(true)
    setError(null)

    const result = await completePasswordReset(token, password)
    setBusy(false)

    if (result.kind === 'error') {
      setError(result.message)
      return
    }

    // Deliberately not signed in: Base44 returns no session from a reset, and using
    // the new password once proves it took.
    onDone()
  }, [busy, confirm, onDone, password, token])

  return { password, setPassword, confirm, setConfirm, error, busy, submit }
}
