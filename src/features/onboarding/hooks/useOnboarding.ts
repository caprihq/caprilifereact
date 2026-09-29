import { useCallback, useState } from 'react'

import { mmkvPrefStore } from '@/services/storage'
import { useUserProfile } from '@/features/profile'
import { needsOnboarding, toProfilePatch } from '../logic/onboardingAnswers'
import type { OnboardingAnswers } from '../logic/onboardingAnswers'

/**
 * Whether to run first-run setup, and what happens when it finishes.
 *
 * The "already done" flag is per device, like the web client's localStorage entry,
 * but it is only half the test: `needsOnboarding` also asks whether the *profile*
 * looks answered. Someone who set up on the web and then installs the app is not
 * asked again, because their name and hours are already on the account.
 *
 * Dismissing counts as done. A wizard that reappears every launch until it is
 * completed is a wizard people learn to fight.
 */

const DONE_KEY = 'capri.onboarding.complete'

export const useOnboarding = () => {
  const { user, update } = useUserProfile()
  const [dismissed, setDismissed] = useState(
    () => mmkvPrefStore.getString(DONE_KEY) === 'true',
  )
  const [saving, setSaving] = useState(false)
  /**
   * Set by "Run setup again", which asks regardless of what the profile holds.
   *
   * Without it the wizard is unreachable the moment a name exists — including for
   * anyone wanting to revisit their answers, and for testing it at all.
   */
  const [forced, setForced] = useState(false)

  const markDone = useCallback(() => {
    mmkvPrefStore.setString(DONE_KEY, 'true')
    setDismissed(true)
    setForced(false)
  }, [])

  const restart = useCallback(() => {
    mmkvPrefStore.setString(DONE_KEY, 'false')
    setDismissed(false)
    setForced(true)
  }, [])

  const finish = useCallback(
    async (answers: OnboardingAnswers) => {
      setSaving(true)
      // Recorded as done whether or not the write lands: a failed save is worth a
      // retry from Profile, not a wizard that blocks the app on every launch.
      const saved = await update(toProfilePatch(answers))
      setSaving(false)
      markDone()
      return saved
    },
    [markDone, update],
  )

  return {
    open: forced || needsOnboarding(user, dismissed),
    restart,
    saving,
    finish,
    skip: markDone,
    /**
     * The name the provider already gave us.
     *
     * App Review guideline 4: a user who signs in with Apple must not then be asked
     * for a name Apple has already supplied. `display_name` first because it is what
     * the account actually carries — the previous version read only `full_name`, so
     * anyone whose name arrived under the other field was asked again.
     *
     * The whole name, not the first word. It is prefilled into a field the user can
     * edit, and truncating it to "Ky" is a change they did not ask for.
     */
    suggestedName: user?.display_name ?? user?.full_name ?? '',
  }
}
