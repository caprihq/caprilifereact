import { Pressable, StyleSheet, View } from 'react-native'

import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
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
  /** Task plus the sentence explaining why it ranks now, from CAPRI or the local engine. */
  readonly entries: readonly { readonly task: Task; readonly reason: string }[]
  readonly loading: boolean
  readonly onRefresh: () => void
  readonly signals?: BehaviouralSignals | undefined
  readonly onOpen: (task: Task) => void
  readonly onComplete: (task: Task) => void
  readonly onDefer: (task: Task) => void
  readonly onCancel: (task: Task) => void
}

export const UpNextCard = ({
  entries,
  loading,
  onRefresh,
  onOpen,
  onComplete,
  onDefer,
  onCancel,
}: UpNextCardProps) => {
  const theme = useTheme()

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState message="Nothing else queued" />
      </Card>
    )
  }

  return (
    <Card flush>
      {entries.map(({ task, reason }, index) => (
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
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {reason}
            </Text>
          </SwipeableTaskRow>
        </View>
      ))}

      {/* Asking again costs a model call, so it is a deliberate tap rather than
          something that happens on every mount. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask CAPRI again"
        onPress={onRefresh}
        disabled={loading}
        style={({ pressed }) => [
          styles.refresh,
          {
            padding: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            opacity: loading ? 0.5 : pressed ? 0.6 : 1,
          },
        ]}
      >
        <Text variant="caption" tone="accent" align="center">
          {loading ? 'Thinking…' : 'Ask CAPRI again'}
        </Text>
      </Pressable>
    </Card>
  )
}

const styles = StyleSheet.create({
  refresh: { width: '100%' },
})
