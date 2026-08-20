import { useCallback, useState } from 'react'

import { extractResetToken } from '../logic/resetToken'
import { validateNewPassword } from '../logic/passwordPolicy'
import { completePasswordReset } from '../services/passwordService'

/**
 * Form state and submission for finishing a password reset.
 *
 * Extracted so the screen stays inside the 80-line body limit (§3.2), matching
 * `useChangePassword` — the two flows are siblings and should read alike.
 *
 * The order matters and is stated once here: parse the pasted link **first**. A
 * mistyped password is worth reporting, but not before telling someone their paste
 * was the wrong thing entirely — otherwise they fix the password, submit again, and
 * only then learn the real problem.
 */
export const useCompleteReset = (onDone: () => void) => {
  const [link, setLink] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = useCallback(async () => {
    if (busy) return

    const token = extractResetToken(link)
    if (token === null) {
      setError('Paste the whole link from the reset email, or just the code in it.')
      return
    }

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
  }, [busy, confirm, link, onDone, password])

  return { link, setLink, password, setPassword, confirm, setConfirm, error, busy, submit }
}
