import { useTheme } from './useTheme'
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
/**
 * A gradient as a style, with the crash guard built in.
 *
 * Shared so that every gradient in the app inherits the floor below rather than
 * each caller having to remember it. See the note on `minWidth`.
 */
export const gradient = (
  stops: readonly string[],
  direction: 'to bottom' | 'to bottom right' = 'to bottom',
): ViewStyle => ({
  /**
   * Never zero-sized — this is a crash guard, not a layout choice.
   *
   * `experimental_backgroundImage` builds its gradient from the view's own measured
   * size: RN's `LinearGradient.getShader(width, height)` derives the start and end
   * points from it, and at 0×0 those points coincide, so
   * `android.graphics.LinearGradient.nativeCreate` throws `IllegalArgumentException`
   * and takes the whole process down — `FATAL EXCEPTION: main`, no JS error, no red
   * box. A view measured at zero for one frame (a scroll container before its
   * content, a stack screen mid-transition) is enough to trigger it, which is how
   * this killed the app twice while the wash was being wired up.
   *
   * A one-pixel floor means the gradient line always has length, so the shader is
   * always valid. Invisible in layout; the alternative is an unguarded crash.
   */
  minWidth: 1,
  minHeight: 1,
  experimental_backgroundImage: [
    { type: 'linear-gradient', direction, colorStops: stops.map((color) => ({ color })) },
  ],
})

export const useWash = (): ViewStyle => {
  const theme = useTheme()

  // Top-down, so the colour reads as light entering the screen from above.
  return { backgroundColor: theme.colors.background, ...gradient(theme.wash) }
}
