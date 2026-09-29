import { useCallback, useState } from 'react'

import { base44 } from '@/services/api'
import { useAuth } from '@/features/auth'
import { useFeedback } from '@/hooks/useFeedback'
import { friendlyMessage, logWarn } from '@/utils'

/**
 * Delete the account, from inside the app.
 *
 * The App Store requires this of any app that lets people create an account, and
 * pointing them at support instead does not satisfy it. It is also the right
 * behaviour on its own terms: someone who wants their data gone should not have to
 * ask permission for it.
 *
 * The backend removes every owned row before the account record, so a partial
 * failure leaves data that still belongs to a reachable user rather than orphaned
 * rows nobody can see or clean up.
 *
 * On success the session is ended locally — the account it authenticated no longer
 * exists, so anything else the app tried to do with it would fail in a far more
 * confusing way than signing out.
 */
export const useDeleteAccount = () => {
  const { signOut } = useAuth()
  const { show } = useFeedback()
  const [deleting, setDeleting] = useState(false)

  const deleteAccount = useCallback(async () => {
    setDeleting(true)
    try {
      const response = (await base44.functions.invoke('deleteAccount', {})) as {
        data?: { deleted?: boolean; account_removed?: boolean }
      }

      if (!response.data?.deleted) {
        show({ message: "Couldn't delete your account. Please try again.", tone: 'error' })
        return
      }

      // Data is gone either way; only the account record may remain, and the person
      // deserves to know which happened rather than a blanket "done".
      show({
        message: response.data.account_removed
          ? 'Your account and data have been deleted.'
          : 'Your data has been deleted. Contact support to finish removing the account.',
        tone: response.data.account_removed ? 'success' : 'warning',
      })

      await signOut()
    } catch (error) {
      logWarn('[account] delete failed', error)
      show({
        message: friendlyMessage(error, "Couldn't delete your account. Please try again."),
        tone: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }, [show, signOut])

  return { deleteAccount, deleting }
}
