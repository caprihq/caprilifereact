import { Image, StyleSheet } from 'react-native'

import { CAPRI_MARK } from '@/assets'
import { useTheme } from '@/hooks/useTheme'

/**
 * The CAPRI brand mark: the real app icon — a white C on slate-900 — bundled at
 * 1024×1024 from the shipped iOS app's AppIcon.
 *
 * Clipped to a circle, so the artwork's own dark ground *becomes* the badge.
 * Nothing is composited and nothing is stretched. An earlier version squeezed the
 * wide wordmark lock-up into a circle, which is what made the logo look poor.
 *
 * The asset is bundled, so it cannot fail to load and needs no fallback.
 */

type AppLogoProps = {
  /** Diameter of the badge. */
  readonly size?: number
}

export const AppLogo = ({ size = 88 }: AppLogoProps) => {
  const theme = useTheme()

  return (
    <Image
      source={CAPRI_MARK}
      accessibilityRole="image"
      accessibilityLabel="CAPRI"
      // The source is square, so `cover` cannot distort it.
      resizeMode="cover"
      style={[
        styles.badge,
        theme.elevation.medium,
        { height: size, width: size, borderRadius: size / 2 },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  badge: { overflow: 'hidden' },
})
