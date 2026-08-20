import { StatusBar } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

/**
 * Status bar tinted for the current theme.
 *
 * Fixes a real defect: the app rendered `<StatusBar barStyle="default" />`,
 * which on Android means light icons whatever the theme — so on the light
 * background the clock and signal icons were near-white on near-white.
 */
export const ThemedStatusBar = () => {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      // Android only; harmless elsewhere. Edge-to-edge is disabled in
      // gradle.properties, so the bar has its own background to paint.
      backgroundColor={theme.colors.background}
      translucent={false}
    />
  )
}
