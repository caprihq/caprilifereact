import { useCallback, useRef, useState } from 'react'

import { requestPasswordReset } from '../services/passwordService'

/** What the caller needs to know: move to the confirmation, or stay and fix something. */
export type ResetRequestOutcome =
  | { readonly kind: 'sent'; readonly email: string }
  | { readonly kind: 'rejected' }

/**
 * "Forgot password?" — request a reset email.
 *
 * **Reports its outcome instead of raising a toast.** The toast was the wrong shape
 * for this: it appeared over a form that looked exactly as it had a moment earlier,
 * so the only evidence that anything had happened slid away after a few seconds. The
 * screen now switches to a "check your email" state, which needs to know whether the
 * request actually went through.
 *
 * **Owns its own `busy` flag.** The sign-in screen used to lend it one, so the button
 * neither disabled nor span while the request was in flight — and a Base44 round trip
 * has measured 4–21s on an emulator. Twenty seconds of nothing changing reads as a
 * broken button, and the natural response is to tap it again.
 */
export const usePasswordReset = () => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The guard reads a ref, not `busy`. Depending on the state would rebuild
  // `request` on every flip, and any caller holding the previous closure would
  // still see `busy === false` and fire a second request.
  const inFlight = useRef(false)

  const request = useCallback(async (email: string): Promise<ResetRequestOutcome> => {
    if (inFlight.current) return { kind: 'rejected' }

    const address = email.trim()
    if (!address.includes('@')) {
      setError('Enter the email address you signed up with.')
      return { kind: 'rejected' }
    }

    inFlight.current = true
    setBusy(true)
    setError(null)

    const result = await requestPasswordReset(address)
    inFlight.current = false
    setBusy(false)

    if (result.kind === 'error') {
      setError(result.message)
      return { kind: 'rejected' }
    }

    return { kind: 'sent', email: address }
  }, [])

  return { request, busy, error, clear: useCallback(() => setError(null), []) }
}
