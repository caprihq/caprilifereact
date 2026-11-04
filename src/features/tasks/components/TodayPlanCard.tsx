import { Pressable, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Text } from '@/components/Text'
import type { TimelineItem } from '@/features/commitments'
import { useTheme } from '@/hooks/useTheme'
import type { TodayPlan } from '../logic/todayPlan'
import { TodayPlanRow } from './TodayPlanRow'

/**
 * Today's Plan — what the day already holds, in time order: commitments, calendar
 * events, appointments and the tasks the person gave a time. Built by
 * `buildTodayPlan`; the full day is one tap away in the planner.
 */

type TodayPlanCardProps = {
  readonly plan: TodayPlan
  readonly timeZone: string
  /** Opens a task. Commitments and calendar events have no detail screen. */
  readonly onSelect: (item: TimelineItem) => void
  /** Asks to remove one of CAPRI's own commitments. Calendar rows ignore it. */
  readonly onLongPress: (item: TimelineItem) => void
  readonly onViewAll: () => void
  /** Today's clashes. Shown as one line that opens the planner, where they are fixed. */
  readonly overlapCount?: number
}

/** "Nothing left" and "nothing planned" are different days, and say so. */
const emptyMessage = (plan: TodayPlan): string =>
  plan.total === 0 ? 'Nothing planned yet today' : 'Nothing else planned today'

export const TodayPlanCard = ({
  plan,
  timeZone,
  onSelect,
  onLongPress,
  onViewAll,
  overlapCount = 0,
}: TodayPlanCardProps) => {
  const theme = useTheme()
  const visible = plan.rows

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
        <EmptyState message={emptyMessage(plan)} />
      ) : (
        visible.map((item, index) => (
          <TodayPlanRow
            key={item.id}
            item={item}
            timeZone={timeZone}
            isFirst={index === 0}
            onPress={() => onSelect(item)}
            onLongPress={() => onLongPress(item)}
          />
        ))
      )}

      <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          style={{ paddingVertical: theme.spacing.md, alignItems: 'center' }}
        >
          <Text variant="label" tone="accent">
            {plan.hidden > 0
              ? `View Full Plan (${String(plan.hidden)} more)`
              : 'View Full Plan'}
          </Text>
        </Pressable>
      </View>
    </Card>
  )
}
