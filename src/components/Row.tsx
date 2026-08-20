import { Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import type { ReactNode } from 'react'

import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * iOS-style settings row: label on the left, value + chevron on the right.
 *
 * The web Profile screen repeats this shape a dozen times (working hours,
 * focus time, timezone, task duration…). One component covers all of them.
 */

type RowProps = {
  readonly label: string
  readonly value?: string | undefined
  readonly onPress?: (() => void) | undefined
  /** Hide the divider on the final row of a group. */
  readonly last?: boolean
  /** Right-hand control (Switch, Badge) instead of value + chevron. */
  readonly accessory?: ReactNode
  readonly destructive?: boolean
}

export const Row = ({
  label,
  value,
  onPress,
  last = false,
  accessory,
  destructive = false,
}: RowProps) => {
  const theme = useTheme()

  const body = (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Text variant="body" tone={destructive ? 'danger' : 'primary'} style={styles.label}>
        {label}
      </Text>

      {accessory ?? (
        <View style={styles.right}>
          {value ? (
            <Text variant="body" tone="secondary" numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {onPress ? (
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          ) : null}
        </View>
      )}
    </View>
  )

  if (!onPress) return body

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      // Dims rather than fills: a background would paint a square corner over the
      // rounded one of the card hosting it, and the card can no longer clip that
      // away — see `Card`.
      style={({ pressed }) => [{ minHeight: size.tapTarget }, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.6 },
  label: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
