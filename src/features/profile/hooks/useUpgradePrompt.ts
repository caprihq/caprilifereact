import { useCallback, useState } from 'react'
import { useNavigation } from '@react-navigation/native'

import { track } from '@/services'

import type { AppNavigation } from '@/navigation/types'
import type { GatedFeature } from '../logic/upgradeCopy'

/**
 * Opening the upgrade prompt from wherever a gate is hit.
 *
 * The web client keeps this in a context provider; a hook is enough here because
 * every gate lives inside a screen that can render the prompt itself, and a provider
 * would put a modal in the tree of screens that gate nothing.
 *
 * "See Executive" closes the prompt *before* navigating. The web client had a bug
 * here worth not repeating: each call site passed its own `onUpgrade` that merely
 * closed the sheet, so the button dead-ended and nobody reached the plan.
 */
export const useUpgradePrompt = () => {
  const navigation = useNavigation<AppNavigation>()
  const [feature, setFeature] = useState<GatedFeature | null>(null)

  const close = useCallback(() => {
    setFeature(null)
  }, [])

  const upgrade = useCallback(() => {
    setFeature(null)
    navigation.navigate('Plan')
  }, [navigation])

  /**
   * Which wall a free user met.
   *
   * Recorded here rather than at each gate: every caller goes through `prompt`, so
   * one line cannot be forgotten by whoever adds the next gated feature. Paired with
   * `upgrade_purchased`, it says which limits actually sell and which merely annoy.
   */
  const prompt = useCallback((gated: GatedFeature) => {
    setFeature(gated)
    track({ name: 'upgrade_prompted', params: { feature: gated } })
  }, [])

  return { feature, prompt, close, upgrade }
}
