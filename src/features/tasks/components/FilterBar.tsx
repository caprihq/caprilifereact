import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { size } from '@/theme'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { TaskFilter } from '@/features/tasks/logic/taskFilters'
import { TASK_FILTERS } from '@/features/tasks/logic/taskFilters'

/**
 * Horizontal filter chips — native port of web/src/components/tasks/FilterBar.jsx.
 *
 * The web version hardcoded a hex dot colour per filter. Those map onto theme
 * roles instead (§4.2), so the chips follow the user's accent and dark mode
 * rather than staying blue in every theme.
 */

const LABELS: Record<TaskFilter, string> = {
  all: 'All',
  critical: 'Critical',
  high: 'High',
  today: 'Today',
  completed: 'Done',
}

type FilterBarProps = {
  readonly active: TaskFilter
  readonly onChange: (filter: TaskFilter) => void
}

export const FilterBar = ({ active, onChange }: FilterBarProps) => {
  const theme = useTheme()

  /** `all` is the neutral option, so it gets no status dot. */
  const dotFor = (filter: TaskFilter): string | null => {
    if (filter === 'all') return null
    if (filter === 'critical') return theme.colors.danger
    if (filter === 'high') return theme.colors.warning
    if (filter === 'completed') return theme.colors.success
    return theme.colors.accentInk
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
    >
      {TASK_FILTERS.map((filter) => {
        const selected = filter === active
        const dot = dotFor(filter)

        return (
          <Pressable
            key={filter}
            onPress={() => onChange(filter)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              {
                borderRadius: theme.radius.full,
                paddingHorizontal: theme.spacing.lg,
                gap: theme.spacing.sm,
                borderColor: selected ? theme.colors.accent : theme.colors.border,
                backgroundColor: selected
                  ? theme.colors.accent
                  : pressed
                    ? theme.colors.background
                    : theme.colors.surface,
              },
            ]}
          >
            {dot ? (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: selected ? theme.colors.textOnAccent : dot },
                ]}
              />
            ) : null}
            <Text variant="label" tone={selected ? 'onAccent' : 'secondary'}>
              {LABELS[filter]}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.tapTarget - 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
