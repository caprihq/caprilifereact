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
 * "Start Here" — the single task CAPRI says to start.
 *
 * The reason line is what makes the recommendation feel considered rather than
 * arbitrary. It is the model's own sentence when one has arrived, and the scoring
 * engine's copy until then — so the card is never blank and never waiting.
 */

type HeroCardProps = {
  readonly task: Task | null
  readonly nowMs: number
  readonly timeZone: string
  readonly signals?: BehaviouralSignals | undefined
  /** CAPRI's sentence, when the model has answered. Falls back to the local copy. */
  readonly reason?: string | undefined
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
  reason,
  onOpen,
  onComplete,
  onDefer,
  onCancel,
}: HeroCardProps) => {
  const theme = useTheme()

  if (!task) {
    return (
      <Card>
        <EmptyState message="No pending tasks" icon="checkmark-done-outline" />
      </Card>
    )
  }

  return (
    /**
     * Ringed and lifted, because the whole premise is that this is *the* thing to do
     * now — and until this it was the same white card as everything under Up Next,
     * distinguishable only by the label above it. The design has to back the idea.
     *
     * A ring rather than a tint: the page already carries a colour wash, and filling
     * the most important card with more of it loses the text rather than framing it.
     */
    <View
      style={[
        theme.elevation.high,
        {
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: theme.colors.accent,
        },
      ]}
    >
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
          {reason ?? getTaskReason(task, nowMs, signals)}
        </Text>
        <TaskMeta task={task} nowMs={nowMs} timeZone={timeZone} />
      </SwipeableTaskRow>
    </View>
  )
}
