import { View } from 'react-native'

import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { getTaskReason } from '@/features/tasks/logic/taskReason'
import type { BehaviouralSignals } from '@/features/tasks/logic/capriScoring'
import type { Task } from '@/types/entities'
import { SwipeableTaskRow } from './SwipeableTaskRow'
import { TaskMeta } from './TaskMeta'

/**
 * "Start Here" — the single highest-ranked task.
 *
 * The reason line is the human output of the scoring engine; it is what makes
 * the recommendation feel considered rather than arbitrary.
 */

type HeroCardProps = {
  readonly task: Task | null
  readonly nowMs: number
  readonly timeZone: string
  readonly signals?: BehaviouralSignals | undefined
  readonly onOpen: (task: Task) => void
  readonly onComplete: (task: Task) => void
  readonly onDefer: (task: Task) => void
  readonly onCancel: (task: Task) => void
}

export const HeroCard = ({
  task,
  nowMs,
  timeZone,
  signals,
  onOpen,
  onComplete,
  onDefer,
  onCancel,
}: HeroCardProps) => {
  const theme = useTheme()

  if (!task) {
    return (
      <Card>
        <EmptyState message="No pending tasks" glyph="🎉" />
      </Card>
    )
  }

  return (
    <View style={{ borderRadius: theme.radius.xl, overflow: 'hidden' }}>
      <SwipeableTaskRow
        onPress={() => onOpen(task)}
        onComplete={() => onComplete(task)}
        onDefer={() => onDefer(task)}
        onCancel={() => onCancel(task)}
        completed={task.status === 'completed'}
      >
        <Text variant="heading" numberOfLines={2}>
          {task.title}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          {getTaskReason(task, nowMs, signals)}
        </Text>
        <TaskMeta task={task} nowMs={nowMs} timeZone={timeZone} />
      </SwipeableTaskRow>
    </View>
  )
}
