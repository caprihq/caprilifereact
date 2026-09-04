import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * One question, its options, and how far through you are.
 *
 * Options are full-width rows rather than a picker: five taps through five screens
 * is the whole setup, and a wizard that opens a modal on every step turns a
 * one-minute job into a chore.
 */

export const StepProgress = ({
  index,
  total,
}: {
  readonly index: number
  readonly total: number
}) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.fill, borderRadius: theme.radius.full },
        ]}
      >
        {/* Flex rather than a percentage width: the fraction is the same and the
            style types take a number without a cast. */}
        <View
          style={[
            styles.fill,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.full,
              flex: (index + 1) / total,
            },
          ]}
        />
        <View style={{ flex: 1 - (index + 1) / total }} />
      </View>
      <Text variant="caption" tone="muted">
        Step {index + 1} of {total}
      </Text>
    </View>
  )
}

export const OptionRow = ({
  label,
  selected,
  onPress,
}: {
  readonly label: string
  readonly selected: boolean
  readonly onPress: () => void
}) => {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.colors.fill : theme.colors.surface,
          borderColor: selected ? theme.colors.accentInk : theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text variant="body">{label}</Text>
      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={theme.colors.accentInk} />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: { height: 6, overflow: 'hidden', flexDirection: 'row' },
  fill: { height: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
})
