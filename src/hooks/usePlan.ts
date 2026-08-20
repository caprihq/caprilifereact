import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { base44 } from '@/services/api'
import { useCurrentUser } from '@/services/api'
import { queryKeys } from '@/services/api'
import type { Plan } from '@/types/entities'
import type { Feature } from '@/config'
import { hasAccess as hasAccessFor, isPaidPlan, labelFor } from '@/config'
import { logWarn } from '@/utils'

/**
 * The user's plan and what it unlocks.
 *
 * `plan` is never written from the client. It is set server-side by the
 * RevenueCat webhook (base44/functions/syncSubscription); the client only
 * reads it, and asks the backend to reconcile against RevenueCat when it
 * suspects drift — after a purchase, or on launch.
 */
export const usePlan = () => {
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useCurrentUser()
  const plan: Plan = user?.plan ?? 'free'

  const hasAccess = useCallback(
    (feature: Feature) => (isLoading ? false : hasAccessFor(plan, feature)),
    [plan, isLoading],
  )

  /**
   * Ask the backend to re-check RevenueCat and repair `user.plan` if it has
   * drifted — the self-healing path for a missed webhook or a restore on a
   * new device.
   */
  const refreshPlan = useCallback(async (): Promise<Plan> => {
    try {
      const result = (await base44.functions.invoke('reconcileEntitlement', {})) as {
        data?: { plan?: Plan }
      }
      const next = result.data?.plan ?? plan
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser })
      return next
    } catch (error) {
      logWarn('[plan] reconcile failed, keeping the known plan', error)
      return plan
    }
  }, [plan, queryClient])

  return useMemo(
    () => ({
      plan,
      planLabel: labelFor(plan),
      isPaid: isPaidPlan(plan),
      isLoading,
      hasAccess,
      refreshPlan,
    }),
    [plan, isLoading, hasAccess, refreshPlan],
  )
}
