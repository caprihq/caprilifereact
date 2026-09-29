import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { useTheme } from '@/hooks/useTheme'
import type { AppTheme } from '@/theme'
import { size } from '@/theme'

/**
 * The only button in the app.
 *
 *   primary   accent fill, soft shadow — the focal action
 *   secondary mood-tinted fill, no border
 *   outline    surface fill, mood-tinted hairline
 *   ghost      label only
 *
 * **The primary action now carries the accent.** It was near-black in every mood,
 * mirroring the web client's shadcn `default`, and that is why choosing a colour
 * changed so little: the biggest, most-looked-at element on every screen ignored it.
 * Near-black is still available through `tone="neutral"` for the rare destructive or
 * secondary-confirm case.
 *
 * The shape is deliberately current: 56pt tall, a 16pt corner, a label at 17pt
 * semibold, and depth only on the focal action — a flat button next to a shadowed
 * one is what makes a hierarchy readable.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

type ButtonProps = {
  readonly label: string
  readonly onPress: () => void
  readonly variant?: ButtonVariant
  readonly loading?: boolean
  readonly disabled?: boolean
  /** Ionicons name, drawn before the label. */
  readonly icon?: string | undefined
  /** Overrides the icon tint, e.g. to keep a brand mark its own colour. */
  readonly iconColor?: string | undefined
  /** `neutral` keeps the old near-black fill, for actions that must not feel themed. */
  readonly tone?: 'accent' | 'neutral'
}

/** Fill for a variant, given the mood and whether it is being pressed. */
const fillFor = ({
  colors,
  variant,
  themed,
  pressed,
}: {
  readonly colors: AppTheme['colors']
  readonly variant: ButtonVariant
  readonly themed: boolean
  readonly pressed: boolean
}): string => {
  if (variant === 'primary') {
    if (themed) return pressed ? colors.accentPressed : colors.accent
    return pressed ? colors.primaryPressed : colors.primary
  }
  if (variant === 'secondary') return colors.fill
  if (variant === 'outline') return pressed ? colors.fill : colors.surface
  /**
   * Destructive actions are outlined rather than filled.
   *
   * Dark mode's danger colour is a *soft* red, so white text on it measures around
   * 2:1 — the same trap the old toast fell into. Ink and border carry the warning;
   * the fill stays out of it.
   */
  if (variant === 'danger') return pressed ? colors.fill : 'transparent'
  return 'transparent'
}

/** Ink that stays readable on that fill. */
const inkFor = (colors: AppTheme['colors'], variant: ButtonVariant, themed: boolean): string => {
  if (variant === 'primary') return themed ? colors.textOnAccent : colors.textOnPrimary
  if (variant === 'ghost') return colors.accentInk
  if (variant === 'danger') return colors.danger
  return colors.textPrimary
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconColor,
  tone = 'accent',
}: ButtonProps) => {
  const theme = useTheme()
  const isInactive = disabled || loading
  const themed = tone === 'accent'
  const labelColor = inkFor(theme.colors, variant, themed)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      accessibilityLabel={label}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: fillFor({ colors: theme.colors, variant, themed, pressed }),
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.xl,
          borderWidth:
            variant === 'outline' || variant === 'danger' ? StyleSheet.hairlineWidth : 0,
          borderColor: variant === 'danger' ? theme.colors.danger : theme.colors.border,
          opacity: isInactive ? 0.45 : 1,
        },
        // Depth on the focal action only, and never while it is disabled — a
        // shadowed dead button reads as tappable.
        variant === 'primary' && !isInactive
          ? pressed
            ? theme.elevation.low
            : theme.elevation.medium
          : null,
        // A 1% squeeze instead of a colour flash: cheaper to notice, harder to
        // mistake for a state change.
        pressed && !isInactive ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={iconColor ?? labelColor}
              style={{ marginRight: theme.spacing.md }}
            />
          ) : null}
          <Text
            style={{
              color: labelColor,
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
            }}
          >
            {label}
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
