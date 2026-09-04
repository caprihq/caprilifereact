import type { ViewStyle } from 'react-native'

/**
 * A gradient as a style, with the two crash guards that matter on Android.
 *
 * ## Why this never uses a corner keyword
 *
 * `experimental_backgroundImage` accepts CSS direction keywords, and
 * `'to bottom right'` is the obvious way to write a diagonal. On Android it takes
 * the whole process down.
 *
 * RN resolves corner keywords by dividing the view's own dimensions
 * (`LinearGradient.kt`: `atan(width / height)`). A view drawn before its bounds are
 * set — which is every view for one frame after a theme change, because the tree
 * re-renders and the drawable is asked to paint at 0×0 — makes that `0.0 / 0.0`,
 * which is `NaN`. The angle is `NaN`, so both endpoints are `NaN`, so Skia's
 * `MakeLinear` rejects a non-finite gradient line and returns null, and the JNI
 * turns that into a **message-less `IllegalArgumentException` on the UI thread**:
 *
 *     FATAL EXCEPTION: main
 *     java.lang.IllegalArgumentException
 *       at android.graphics.LinearGradient.nativeCreate(Native Method)
 *       at com.facebook.react.uimanager.drawable.BackgroundImageDrawable.draw
 *
 * No JS error, no red box, no Crashlytics stack that points anywhere useful — the
 * app simply dies. It is what killed CAPRI every time someone switched light and
 * dark, because the appearance picker is the one screen with a diagonal gradient.
 *
 * Angles take a different path through RN (`Direction.Angle`) that never divides, so
 * a 0×0 draw stays finite. Every direction here is therefore emitted as an angle.
 *
 * `'135deg'` equals `'to bottom right'` for a **square**, which is what the swatch
 * dots are. For a non-square box CSS turns the corner gradient so its line is
 * perpendicular to the box diagonal, so if a rectangular diagonal is ever needed,
 * compute the angle from the known size — do not reach back for the keyword.
 */

export type GradientDirection = 'to bottom' | 'to bottom right'

/** Direction → the equivalent angle, avoiding RN's dimension division. */
const ANGLE: Record<GradientDirection, string> = {
  'to bottom': '180deg',
  'to bottom right': '135deg',
}

export const gradient = (
  stops: readonly string[],
  direction: GradientDirection = 'to bottom',
): ViewStyle => ({
  /**
   * Never zero-sized — the second guard, and still worth keeping.
   *
   * Even on the angle path, a gradient line of zero length is a degenerate shader.
   * A one-pixel floor means it always has length. Invisible in layout.
   */
  minWidth: 1,
  minHeight: 1,
  experimental_backgroundImage: [
    {
      type: 'linear-gradient',
      direction: ANGLE[direction],
      colorStops: stops.map((color) => ({ color })),
    },
  ],
})
