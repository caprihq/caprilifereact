import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { useTheme } from '@/hooks/useTheme'
import { size } from '@/theme'
import type { OAuthProvider } from '../services/oauth'

/**
 * Continue with Google / Continue with Apple.
 *
 * Deliberately **not** the app's `Button`. Rendered as `variant="secondary"` they
 * came out as two pale grey slabs — the mood's own tinted fill on a tinted page,
 * which is almost no contrast at all, so the two most important choices on the
 * screen were the hardest to see.
 *
 * **One treatment for both, so the screen holds two colours.** Google white and
 * Apple black put three fills on the first screen — white, black, and the accent
 * under "Sign in with email" — and three is one more than a screen this small can
 * hold together. Both vendors permit a light button (Apple's guidelines list white
 * and white-with-outline beside black), so the providers share a neutral surface and
 * the accent is left to mark the focal action. Two colours, one hierarchy: neutral
 * for "use an account you already have", accent for "do the thing".
 *
 * They still ignore the mood — a Google button that turns terracotta stops reading
 * as a Google button — so the surface is the plain page colour rather than the
 * tinted `fill`, and the logos stay in their own ink.
 */

export const ProviderButton = ({
  provider,
  onPress,
  loading = false,
  disabled = false,
}: {
  readonly provider: OAuthProvider
  readonly onPress: () => void
  readonly loading?: boolean
  readonly disabled?: boolean
}) => {
  const theme = useTheme()
  const isInactive = disabled || loading
  const isApple = provider === 'apple'

  // The untinted page colour, so both buttons read as neutral against the wash.
  const surface = theme.colors.surface
  const label = theme.colors.textPrimary
  const labelText = isApple ? 'Continue with Apple' : 'Continue with Google'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labelText}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: surface,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.xl,
          // A hairline, because a white button on a barely-tinted page needs an edge
          // to be a button at all.
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          opacity: isInactive ? 0.45 : 1,
        },
        // Both sit on a tinted page, so both get a lift to separate from it.
        isInactive ? null : theme.elevation.low,
        pressed && !isInactive ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={label} />
      ) : (
        <View style={styles.row}>
          <Ionicons
            name={isApple ? 'logo-apple' : 'logo-google'}
            size={20}
            color={label}
            style={{ marginRight: theme.spacing.md }}
          />
          <Text
            style={{
              color: label,
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
            }}
          >
            {labelText}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: size.control + 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  pressed: { transform: [{ scale: 0.99 }] },
})
