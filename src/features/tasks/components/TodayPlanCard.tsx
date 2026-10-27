import { Pressable, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { Task } from '@/types/entities'

/**
 * Today's Plan — scheduled or due today, capped at three with a way through
 * to the full planner. Mirrors the web client's TodayPlanCard.
 */

const MAX_ROWS = 3

type TodayPlanCardProps = {
  readonly tasks: readonly Task[]
  readonly timeZone: string
  readonly onOpen: (task: Task) => void
  readonly onViewAll: () => void
  /** Today's clashes. Shown as one line that opens the planner, where they are fixed. */
  readonly overlapCount?: number
}

export const TodayPlanCard = ({ tasks, timeZone, onOpen, onViewAll, overlapCount = 0 }: TodayPlanCardProps) => {
  const theme = useTheme()
  const visible = tasks.slice(0, MAX_ROWS)

  return (
    <Card flush>
      {overlapCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
          <Text variant="label" tone="danger" style={{ flex: 1 }}>
            {overlapCount === 1 ? '1 overlap today' : `${String(overlapCount)} overlaps today`}
          </Text>
          <Text variant="label" tone="accent">
            Review
          </Text>
        </Pressable>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState message="No tasks scheduled for today" />
      ) : (
        visible.map((task, index) => (
          <Pressable
            key={task.id}
            accessibilityRole="button"
            accessibilityLabel={task.title}
            onPress={() => onOpen(task)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
                opacity: pressed ? 0.6 : 1,
              },
              index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
            ]}
          >
            <Text variant="caption" tone={task.scheduled_start_time ? 'secondary' : 'accent'}>
              {slotLabel(task, timeZone)}
            </Text>
            <Text variant="caption" tone="muted">
              •
            </Text>
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {task.title}
            </Text>
          </Pressable>
        ))
      )}

      <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          style={{ paddingVertical: theme.spacing.md, alignItems: 'center' }}
        >
          <Text variant="label" tone="accent">
            View Full Plan
          </Text>
        </Pressable>
      </View>
    </Card>
  )
}

/** Start time when scheduled, otherwise flag it as a suggestion. */
const slotLabel = (task: Task, timeZone: string): string => {
  const iso = task.scheduled_start_time
  if (!iso) return 'Suggested'

  const start = new Date(iso)
  if (Number.isNaN(start.getTime())) return 'Suggested'

  return start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })
}
