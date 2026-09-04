import { Image } from 'react-native'

import { CAPRI_WORDMARK_DARK, CAPRI_WORDMARK_LIGHT } from '@/assets'
import { useTheme } from '@/hooks/useTheme'

/**
 * The CAPRI wordmark, in the variant the current mode needs.
 *
 * Two files rather than one tinted image, because that is the client's
 * requirement and because a wordmark is artwork, not a glyph: `tintColor` would
 * flatten it and would break the moment the mark gains a second colour.
 *
 *   light mode → navy ink on transparent
 *   dark mode  → white ink on transparent
 *
 * Both are the same assets the web client uses (`LogoConfig.jsx`), bundled here
 * rather than fetched so the first frame is never empty and there is nothing to
 * fail offline.
 *
 * This replaced the app icon in a circular badge. The icon is a *square* mark for
 * the home screen; using it as an in-app logo meant the brand appeared as a badge
 * in one place and as text in another.
 */

/** Both files are 663×157; the height prop drives width through this. */
export const LOGO_ASPECT_RATIO = 663 / 157

/**
 * The artwork for a mode.
 *
 * Exported and pure so the client's requirement can be asserted without a
 * renderer: the two modes must resolve to *different files*. The tempting
 * simplification is one asset plus `tintColor`, which looks identical in a
 * screenshot of a one-colour wordmark and breaks the moment the mark gains a
 * second colour.
 */
export const wordmarkFor = (mode: 'light' | 'dark'): number =>
  mode === 'dark' ? CAPRI_WORDMARK_DARK : CAPRI_WORDMARK_LIGHT

type AppLogoProps = {
  /** Rendered height in points. Width follows the artwork's aspect ratio. */
  readonly height?: number
}

export const AppLogo = ({ height = 44 }: AppLogoProps) => {
  const theme = useTheme()

  return (
    <Image
      source={wordmarkFor(theme.mode)}
      accessibilityRole="image"
      accessibilityLabel="CAPRI"
      // `contain` with a fixed aspect ratio: the mark is never cropped or stretched,
      // whatever height a screen asks for.
      resizeMode="contain"
      style={{ height, width: height * LOGO_ASPECT_RATIO }}
    />
  )
}
