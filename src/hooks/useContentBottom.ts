import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from './useTheme'
import { size } from '@/theme'

/**
 * How much empty space a scrolling screen needs at its foot.
 *
 * Two things can cover the bottom of a page and neither pushes content up: the home
 * indicator, and the translucent native tab bar. Screens were each guessing —
 * `spacing.md` on All tasks, nothing at all on the planner, a doubled `xxxl` on Home
 * — so the amount of clearance depended on which file you were in, and Profile's
 * Sign out button sat behind the tab bar.
 *
 * One answer instead, in one place, so a new screen inherits it by asking.
 *
 * @param underTabBar true for screens hosted *inside* the tabs (Home, Profile). A
 * screen pushed over the tabs hides the bar, so it only clears the home indicator.
 */
export const useContentBottom = (underTabBar = false): number => {
  const insets = useSafeAreaInsets()
  const theme = useTheme()

  return insets.bottom + theme.spacing.xl + (underTabBar ? size.tabBar : 0)
}
