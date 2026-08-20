import { useCallback, useRef, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { requestPasswordReset } from '../services/passwordService'

/**
 * "Forgot password?" — request a reset email.
 *
 * `requestPasswordReset` was written and never called, so a user who forgot
 * their password had no route through the app at all.
 *
 * **Owns its own `busy` flag.** The screen previously reused the sign-in flag, so
 * the button neither disabled nor showed a spinner while the request was in
 * flight — and a Base44 round trip has measured 4–21s on an emulator. Twenty
 * seconds of nothing changing reads as a broken button, and the natural response
 * is to tap it again.
 *
 * Confirmation goes through the toast rather than a small inline line, which was
 * quiet enough to miss with the keyboard up.
 */
export const usePasswordReset = () => {
  const { show } = useFeedback()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The guard reads a ref, not `busy`. Depending on the state would rebuild
  // `request` on every flip, and any caller holding the previous closure would
  // still see `busy === false` and fire a second request.
  const inFlight = useRef(false)

  const request = useCallback(
    async (email: string) => {
      if (inFlight.current) return

      const address = email.trim()
      if (!address) {
        setError('Enter your email address first, then tap Forgot password.')
        return
      }

      inFlight.current = true
      setBusy(true)
      setError(null)

      const result = await requestPasswordReset(address)
      inFlight.current = false
      setBusy(false)

      if (result.kind === 'error') {
        setError(result.message)
        return
      }

      // Deliberately non-committal about whether the address exists: confirming
      // it would let anyone probe which emails are registered. The cost is that
      // a typo looks identical to a successful send.
      show({ message: `If ${address} has an account, a reset link is on its way.` })
    },
    [show],
  )

  return { request, busy, error, clear: useCallback(() => setError(null), []) }
}
