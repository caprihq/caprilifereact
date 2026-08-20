import { Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { ModePreference } from '@/store/themeStore'

/**
 * System · Light · Dark, as three visible choices.
 *
 * This replaced a lone "Dark mode" switch, which hid the model rather than showing
 * it. The app has always had *three* preferences — the switch could only express
 * two, so "follow the system" was reachable only by turning dark mode off, and
 * nothing on screen said so. A user looking at an app that had gone dark on its own
 * saw a switch in the off position and no explanation.
 *
 * Three labelled options state the whole model in one line: what is available, and
 * which one is currently in force.
 */

const OPTIONS: readonly { readonly value: ModePreference; readonly label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export const ModeChoice = ({
  mode,
  onSelect,
}: {
  readonly mode: ModePreference
  readonly onSelect: (mode: ModePreference) => void
}) => {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.colors.fill, borderRadius: theme.radius.lg, padding: 3 },
      ]}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === mode

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onSelect(option.value)}
            style={[
              styles.option,
              { borderRadius: theme.radius.md, paddingVertical: theme.spacing.sm },
              // The chosen one is a raised card on a recessed track — the same
              // language the rest of the app uses for "this is the current thing".
              selected ? { backgroundColor: theme.colors.surface, ...theme.elevation.low } : null,
            ]}
          >
            <Text variant="label" tone={selected ? 'primary' : 'secondary'} align="center">
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  option: { flex: 1 },
})
