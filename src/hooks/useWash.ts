import { useTheme } from './useTheme'
import { gradient } from '@/theme'
import type { ViewStyle } from 'react-native'

/**
 * The mood's wash, as a style a screen can put on the container it already has.
 *
 * `MoodBackground` wraps children in a view; this is the same paint without the
 * view. Most screens already own a full-height root — a `SafeAreaView`, or a
 * `ScrollView` whose `style` is the viewport — and were painting it flat with
 * `colors.background`, which is why the gradient reached only the auth screens
 * and the loading state. Handing them a style instead of a wrapper turns each of
 * those into one line, with no extra node in the tree and no gradient literal
 * copied eleven times.
 *
 * The solid colour stays underneath: `experimental_backgroundImage` is still
 * marked experimental upstream, so if a platform ignores it the screen is a clean
 * background rather than a transparent hole.
 */
export const useWash = (): ViewStyle => {
  const theme = useTheme()

  // Top-down, so the colour reads as light entering the screen from above.
  return { backgroundColor: theme.colors.background, ...gradient(theme.wash) }
}
