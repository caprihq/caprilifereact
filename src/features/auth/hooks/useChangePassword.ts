import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { useCurrentUser } from '@/services/api'
import { validatePasswordChange } from '../logic/passwordPolicy'
import { changePassword } from '../services/passwordService'

/**
 * Form state and submission for changing a password.
 *
 * Extracted so the screen stays inside the 80-line body limit (§3.2) and so the
 * ordering — validate locally, then confirm identity, then call — is stated once.
 *
 * The user id comes from React Query, which owns identity; this does not
 * re-fetch `auth.me()` to learn who is signed in.
 */
export const useChangePassword = (onDone: () => void) => {
  const { show } = useFeedback()
  const { data: user } = useCurrentUser()
  // Read out before the callback: depending on `user?.id` while the compiler
  // infers `user` makes the memoisation unpreservable.
  const userId = user?.id

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = useCallback(async () => {
    if (busy) return

    const check = validatePasswordChange(current, next, confirm)
    if (check.kind === 'invalid') {
      setError(check.message)
      return
    }

    // Identity still loading, or the session went away underneath us.
    if (!userId) {
      setError('Could not confirm who is signed in. Please try again.')
      return
    }

    setBusy(true)
    setError(null)

    const result = await changePassword(userId, current, next)
    setBusy(false)

    if (result.kind === 'error') {
      setError(result.message)
      return
    }

    show({ message: 'Password changed.' })
    onDone()
  }, [busy, confirm, current, next, onDone, show, userId])

  return { current, setCurrent, next, setNext, confirm, setConfirm, error, busy, submit }
}
