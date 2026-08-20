import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  adoptSessionToken,
  restoreSession,
  signOut as signOutService,
} from '../services/authService'
import type { AuthResult } from '../services/authService'
import { registerForPush } from '../services/pushRegistration'
import { useSessionKeepAlive } from '../hooks/useSessionKeepAlive'
import { setCrashUser } from '@/services'
import { setIAPUser } from '@/services/native'
import type { User } from '@/types/entities'

/**
 * Session state for the whole app.
 *
 * `status` is an explicit state machine so every screen renders exactly one
 * thing — no combination of booleans can express an impossible state
 * (guidelines §2.6).
 */
export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated' | 'error'

export type AuthState = {
  readonly status: AuthStatus
  readonly user: User | null
  readonly errorMessage: string | null
}

type AuthActions = {
  readonly adoptToken: (token: string) => Promise<boolean>
  readonly signOut: () => Promise<void>
  readonly retry: () => Promise<void>
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null)

const INITIAL: AuthState = {
  status: 'restoring',
  user: null,
  errorMessage: null,
}

/** Map a service result onto view state. Pure — no I/O, no hooks. */
const toState = (result: AuthResult): AuthState => {
  if (result.kind === 'authenticated') {
    return { status: 'authenticated', user: result.user, errorMessage: null }
  }
  if (result.kind === 'error') {
    return { status: 'error', user: null, errorMessage: result.message }
  }
  return { status: 'unauthenticated', user: null, errorMessage: null }
}

export const AuthProvider = ({ children }: { readonly children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(INITIAL)

  /**
   * Resolve a result into state and keep Crashlytics' user in step.
   * State is only ever written here, after an await — never synchronously
   * inside an effect, which would cascade an extra render.
   */
  const applyResult = useCallback((result: AuthResult) => {
    const next = toState(result)
    setCrashUser(next.user?.id ?? null)
    // RevenueCat's appUserID must match the Base44 id or an existing
    // subscriber's entitlement cannot be attributed to them on a new device.
    // Fire-and-forget: a failed logIn only degrades attribution, and the
    // session itself must not wait on the store.
    void setIAPUser(next.user?.id ?? null)
    setState(next)
  }, [])

  // Launch path. Initial status is already 'restoring', so nothing needs
  // setting before the await.
  useEffect(() => {
    let active = true
    const run = async () => {
      const result = await restoreSession()
      if (active) applyResult(result)
    }
    void run()
    return () => {
      active = false
    }
  }, [applyResult])

  /** User-initiated retry — safe to show the spinner immediately. */
  const retry = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'restoring', errorMessage: null }))
    applyResult(await restoreSession())
  }, [applyResult])

  const adoptToken = useCallback(
    async (token: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, status: 'restoring', errorMessage: null }))
      const result = await adoptSessionToken(token)
      applyResult(result)
      return result.kind === 'authenticated'
    },
    [applyResult],
  )

  const signOut = useCallback(async () => {
    await signOutService()
    setCrashUser(null)
    setState({ status: 'unauthenticated', user: null, errorMessage: null })
  }, [])

  /**
   * Renew the token before it dies. Without this the app pushes people back to
   * the login screen every few hours, since Base44 tokens are short-lived and
   * its SDK has no refresh call. An expiry re-runs `retry`, which re-verifies
   * and routes to login if the session is genuinely gone.
   */
  useSessionKeepAlive({
    enabled: state.status === 'authenticated',
    onExpired: () => void retry(),
  })

  /**
   * Register for push once a session exists. The token has to be handed to the
   * backend, which is the step that was missing entirely — nothing called
   * `getPushToken`, so no notification could ever be delivered.
   */
  const userId = state.user?.id
  useEffect(() => {
    if (!userId) return
    void registerForPush()
  }, [userId])

  const value = useMemo(
    () => ({ ...state, adoptToken, signOut, retry }),
    [state, adoptToken, signOut, retry],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export const useAuth = () => {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
