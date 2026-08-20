import { StyleSheet, View } from 'react-native'

import { AppLogo } from '@/components/AppLogo'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * Badge, welcome heading and subtitle above the sign-in actions.
 *
 * Replaces a bare text wordmark and tagline. The heading names the product in
 * full, which is what the target design leads with, and the subtitle states what
 * the screen is for rather than restating the tagline.
 */
export const AuthBrand = () => {
  const theme = useTheme()

  return (
    <View style={styles.root}>
      <AppLogo size={88} />

      <Text
        variant="title"
        align="center"
        style={{ marginTop: theme.spacing.xl }}
      >
        Welcome to CAPRI for Life
      </Text>

      <Text variant="body" tone="secondary" align="center" style={{ marginTop: theme.spacing.sm }}>
        Sign in to continue
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
})
