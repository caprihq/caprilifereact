import { StyleSheet, View } from 'react-native'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { TaskStats } from '@/features/tasks/logic/taskStats'

/**
 * Four headline counts — native port of web/src/components/tasks/QuickStats.jsx.
 *
 * The web version drew white text on a translucent overlay because it sat on a
 * coloured hero image, and hardcoded a hex accent per tile. Here each tile is a
 * surface card with a themed accent bar, so it reads in both light and dark
 * (§4.2). Counts are computed by `computeTaskStats`, not here.
 */

type QuickStatsProps = {
  readonly stats: TaskStats
}

export const QuickStats = ({ stats }: QuickStatsProps) => {
  const theme = useTheme()

  const tiles = [
    { key: 'pending', label: 'Pending', value: stats.pending, color: theme.colors.textSecondary },
    { key: 'inProgress', label: 'In Progress', value: stats.inProgress, color: theme.colors.accentInk },
    { key: 'dueToday', label: 'Due Today', value: stats.dueToday, color: theme.colors.warning },
    { key: 'critical', label: 'Critical', value: stats.critical, color: theme.colors.danger },
  ] as const

  return (
    <View style={[styles.grid, { gap: theme.spacing.sm }]}>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          accessibilityLabel={`${tile.label}: ${String(tile.value)}`}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderLeftColor: tile.color,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.sm,
              gap: theme.spacing.xs,
            },
          ]}
        >
          <Text variant="title">{tile.value}</Text>
          <Text variant="caption" tone="muted" align="center">
            {tile.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row' },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 4 },
})
