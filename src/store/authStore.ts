import { create } from 'zustand'

import type { User } from '@/types/entities'

/**
 * Authentication **flow status** — client state, not the user record.
 *
 * Deliberate split. `auth.me()` is a server call, so the user's *identity* is
 * owned by React Query (`useCurrentUser`). Previously both an AuthContext and
 * that query fetched it, giving the app two sources of truth for the same user
 * which could drift. This store holds only what Query cannot: where the app is
 * in the sign-in flow.
 *
 * `status` is an explicit state machine so no combination of booleans can
 * express an impossible state (§2.6).
 *
 * Readable outside React via `useAuthStore.getState()`, which is what lets the
 * refresh watchdog report an expiry without being handed a callback — the web
 * client hand-rolled module globals in token-refresh.js for exactly this.
 */

export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated' | 'error'

type AuthState = {
  readonly status: AuthStatus
  /** Snapshot from the last verification. Query remains the source of truth. */
  readonly user: User | null
  readonly errorMessage: string | null

  readonly setRestoring: () => void
  readonly setAuthenticated: (user: User) => void
  readonly setUnauthenticated: () => void
  readonly setError: (message: string) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'restoring',
  user: null,
  errorMessage: null,

  setRestoring: () => set({ status: 'restoring', errorMessage: null }),

  setAuthenticated: (user) => set({ status: 'authenticated', user, errorMessage: null }),

  setUnauthenticated: () => set({ status: 'unauthenticated', user: null, errorMessage: null }),

  setError: (message) => set({ status: 'error', user: null, errorMessage: message }),
}))

/** For non-React callers such as the session keep-alive watchdog. */
export const authStatus = (): AuthStatus => useAuthStore.getState().status
