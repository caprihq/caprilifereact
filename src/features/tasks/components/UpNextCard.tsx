import { View } from 'react-native'

import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { getTaskReason } from '@/features/tasks/logic/taskReason'
import type { BehaviouralSignals } from '@/features/tasks/logic/capriScoring'
import type { Task } from '@/types/entities'
import { SwipeableTaskRow } from './SwipeableTaskRow'

/**
 * "Up Next" — the next best three after the hero.
 *
 * Free and paid users both get this list; the difference upstream is whether
 * the ranking came from the local scorer or an LLM pass (see FEATURE_PLANS —
 * `whats_next` is deliberately not gated).
 */

type UpNextCardProps = {
  readonly tasks: readonly Task[]
  readonly nowMs: number
  readonly signals?: BehaviouralSignals | undefined
  readonly onOpen: (task: Task) => void
  readonly onComplete: (task: Task) => void
  readonly onDefer: (task: Task) => void
  readonly onCancel: (task: Task) => void
}

export const UpNextCard = ({
  tasks,
  nowMs,
  signals,
  onOpen,
  onComplete,
  onDefer,
  onCancel,
}: UpNextCardProps) => {
  const theme = useTheme()

  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState message="Nothing else queued" />
      </Card>
    )
  }

  return (
    <Card flush>
      {tasks.map((task, index) => (
        <View
          key={task.id}
          style={
            index === 0
              ? undefined
              : { borderTopWidth: 1, borderTopColor: theme.colors.border }
          }
        >
          <SwipeableTaskRow
            onPress={() => onOpen(task)}
            onComplete={() => onComplete(task)}
            onDefer={() => onDefer(task)}
            onCancel={() => onCancel(task)}
            completed={task.status === 'completed'}
          >
            <Text variant="bodyStrong" numberOfLines={1}>
              {task.title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {getTaskReason(task, nowMs, signals)}
            </Text>
          </SwipeableTaskRow>
        </View>
      ))}
    </Card>
  )
}
