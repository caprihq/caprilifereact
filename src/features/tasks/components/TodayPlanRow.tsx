import { Pressable } from 'react-native'

import { Text } from '@/components/Text'
import type { TimelineItem } from '@/features/commitments'
import { useTheme } from '@/hooks/useTheme'

/**
 * One line of Today's Plan: the start, then what it is.
 *
 * Tasks the person gave a time are in the accent colour, so what they chose to do
 * reads apart from what was booked for them.
 */

type TodayPlanRowProps = {
  readonly item: TimelineItem
  readonly timeZone: string
  readonly isFirst: boolean
  readonly onPress: () => void
  readonly onLongPress: () => void
}

/** The start, compact: the planner shows the full range. */
const startLabel = (item: TimelineItem, timeZone: string): string =>
  item.allDay
    ? 'All day'
    : new Date(item.sortMs).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      })

export const TodayPlanRow = ({
  item,
  timeZone,
  isFirst,
  onPress,
  onLongPress,
}: TodayPlanRowProps) => {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          opacity: pressed ? 0.6 : 1,
        },
        !isFirst && { borderTopWidth: 1, borderTopColor: theme.colors.border },
      ]}
    >
      <Text variant="caption" tone={item.source === 'task' ? 'accent' : 'secondary'}>
        {startLabel(item, timeZone)}
      </Text>
      <Text variant="caption" tone="muted">
        •
      </Text>
      <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
        {item.title}
      </Text>
    </Pressable>
  )
}
