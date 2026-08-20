import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import {
  ATTEMPT_THROTTLE_MS,
  MIN_TIMER_MS,
  decideRefresh,
  nextTimerDelay,
} from '@/features/auth/logic/refreshPolicy'
import type { RefreshTrigger } from '@/features/auth/logic/refreshPolicy'
import { readStoredToken } from '../services/authService'
import { refreshSessionToken, unsupportedSinceMs } from '../services/tokenRefresh'
import { logWarn } from '@/utils'

/**
 * Keeps the session alive while the app is in use.
 *
 * Two wake sources, both of which the web version had:
 *
 *   foreground — the important one. A phone left overnight comes back with a
 *                dead token, and without this the first API call fails instead.
 *   timer      — aimed at the start of the renewal window.
 *
 * `onExpired` hands control back to the auth state machine, which re-verifies
 * and routes to the login screen where auto-resume takes over. This hook never
 * decides that itself.
 *
 * Only runs while authenticated: probing a refresh endpoint with no token is
 * pointless, and it must not fire on the login screen.
 */
export const useSessionKeepAlive = (options: {
  readonly enabled: boolean
  readonly onExpired: () => void
}): void => {
  const { enabled, onExpired } = options

  // Held in refs so the effect subscribes once rather than re-subscribing every
  // time the caller passes a new closure or an attempt updates the clock.
  const onExpiredRef = useRef(onExpired)
  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  const lastAttemptAtRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    // Read through a function on purpose. TypeScript narrows a captured boolean
    // to its initialiser inside these closures — it cannot see the cleanup
    // reassign it — and then flags every cancellation check as dead code. A call
    // is opaque to that narrowing, so the guards stay honest.
    let alive = true
    const isAlive = () => alive
    let timer: ReturnType<typeof setTimeout> | undefined

    const rearm = (delayMs: number) => {
      if (!isAlive()) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void cycle('timer'), Math.max(delayMs, MIN_TIMER_MS))
    }

    const cycle = async (trigger: RefreshTrigger): Promise<void> => {
      if (!isAlive()) return

      const token = await readStoredToken()
      if (!isAlive()) return

      const decision = decideRefresh(token, {
        nowMs: Date.now(),
        lastAttemptAtMs: lastAttemptAtRef.current,
        unsupportedAtMs: unsupportedSinceMs(),
      })

      if (decision.kind === 'idle') return
      if (decision.kind === 'wait') {
        rearm(decision.delayMs)
        return
      }
      if (decision.kind === 'expired') {
        logWarn(`[keepAlive] session expired (${trigger}); re-verifying`)
        onExpiredRef.current()
        return
      }

      lastAttemptAtRef.current = Date.now()
      const result = await refreshSessionToken(Date.now())
      if (!isAlive()) return

      if (result.kind === 'rejected') {
        onExpiredRef.current()
        return
      }

      // Renewed, unsupported or a transient failure all just re-arm; the policy
      // decides what the next wake should look like given the new state.
      const next = await readStoredToken()
      if (!isAlive()) return
      rearm(nextTimerDelay(next, Date.now()) ?? ATTEMPT_THROTTLE_MS)
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void cycle('foreground')
    })

    void cycle('launch')

    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      subscription.remove()
    }
  }, [enabled])
}
