import { useQuery } from '@tanstack/react-query'

import { base44 } from '@/services/api'
import type { AdminUser } from '../logic/recipients'

/**
 * Everyone an admin can send to.
 *
 * Fetched through a function rather than the entity, because row rules scope `User`
 * to the person asking — correctly, since nobody should be able to enumerate the
 * customer list from the app. `listUsers` does the role check server-side.
 *
 * Cached for a few minutes: the list changes rarely, and an admin opening the picker
 * three times while composing one message should not fetch it three times.
 */
export const useAdminUsers = (enabled: boolean) =>
  useQuery({
    queryKey: ['admin', 'users'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<readonly AdminUser[]> => {
      const response = (await base44.functions.invoke('listUsers', {})) as {
        data?: { users?: readonly AdminUser[] }
      }

      return response.data?.users ?? []
    },
  })
