import { useCallback, useState } from 'react'

import { signInWithProvider } from '../services/oauth'
import type { OAuthProvider } from '../services/oauth'
import { useAuth } from '../model/AuthContext'

/**
 * Google and Apple sign-in for the login screen.
 *
 * Tracks *which* provider is running, not just "busy", so only the button the user
 * tapped shows a spinner while both are disabled.
 *
 * Cancelling is silent by design: closing the sheet is a decision, not an error,
 * and an error message under a button the user deliberately dismissed reads as a
 * malfunction.
 */
export const useProviderSignIn = () => {
  const { adoptToken } = useAuth()
  const [running, setRunning] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(
    async (provider: OAuthProvider) => {
      if (running) return
      setRunning(provider)
      setError(null)
      try {
        const outcome = await signInWithProvider(provider)
        if (outcome.kind === 'failed') setError(outcome.message)
        else if (outcome.kind === 'success') await adoptToken(outcome.token)
      } finally {
        setRunning(null)
      }
    },
    [adoptToken, running],
  )

  return {
    start,
    /** The provider currently in flight, for a spinner on that button alone. */
    running,
    busy: running !== null,
    error,
  }
}
