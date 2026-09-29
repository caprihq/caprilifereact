import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { CategoryIcon } from './CategoryIcon'
import { asideView } from '../logic/plannerLogic'
import type { Task } from '@/types/entities'

/**
 * Work that is not in a time block: due today with no time, or carried over.
 *
 * Rendered as a quiet list rather than full rows — the action these need is
 * "give me a time", which is one tap into the task, so anything more would compete
 * with the blocks above. Renders nothing when empty.
 */

type PlannerAsideProps = {
  readonly title: string
  readonly subtitle: string
  readonly tasks: readonly Task[]
  /** Opens the full, virtualized list when the aside is truncated. */
  readonly onSeeAll: () => void
  readonly tone: 'warning' | 'muted'
  readonly onOpen: (task: Task) => void
}

export const PlannerAside = ({
  title,
  subtitle,
  tasks,
  tone,
  onOpen,
  onSeeAll,
}: PlannerAsideProps) => {
  const { shown, hidden } = asideView(tasks)
  const theme = useTheme()
  if (tasks.length === 0) return null

  const accent = tone === 'warning' ? theme.colors.warning : theme.colors.textMuted

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={[styles.header, { gap: theme.spacing.sm }]}>
        <Ionicons
          name={tone === 'warning' ? 'alert-circle-outline' : 'time-outline'}
          size={18}
          color={accent}
        />
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="muted">
          {subtitle}
        </Text>
        <View style={styles.spacer} />
        <Text variant="caption" tone="secondary">
          {tasks.length}
        </Text>
      </View>

      <Card flush>
        {shown.map((task, index) => (
          <Pressable
            key={task.id}
            accessibilityRole="button"
            accessibilityLabel={`Schedule ${task.title}`}
            onPress={() => onOpen(task)}
            style={({ pressed }) => [
              styles.row,
              {
                padding: theme.spacing.md,
                gap: theme.spacing.sm,
                backgroundColor: pressed ? theme.colors.fill : 'transparent',
                borderBottomWidth: index === shown.length - 1 ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <Text variant="body" numberOfLines={1} style={styles.title}>
              <CategoryIcon task={task} /> {task.title}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        ))}

        {hidden > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${String(tasks.length)} tasks`}
            onPress={onSeeAll}
            style={({ pressed }) => [
              styles.row,
              {
                padding: theme.spacing.md,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.colors.border,
                backgroundColor: pressed ? theme.colors.fill : 'transparent',
              },
            ]}
          >
            <Text variant="label" style={{ color: theme.colors.accentInk, flex: 1 }}>
              {hidden} more
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.accentInk} />
          </Pressable>
        ) : null}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
})
