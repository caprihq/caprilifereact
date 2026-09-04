import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { AppTheme } from '@/theme'
import type { Task } from '@/types/entities'
import { bandFor, durationLabel, emojiFor } from '../logic/taskPresentation'
import { anchorOf } from '../logic/timeSlots'

/**
 * A task inside a time block: compact, because the block already says when.
 *
 * Deliberately not `TaskCard`. The card leads with priority and due date, both of
 * which are noise here — the planner has already grouped by time, and repeating the
 * due date next to a scheduled time is how the web version's rows became cluttered.
 * What matters in a block is the clock time, the length, and two actions.
 */

type PlannerTaskRowProps = {
  readonly task: Task
  readonly nowMs: number
  readonly timeZone: string
  readonly onOpen: () => void
  readonly onComplete: () => void
  readonly onRemove: () => void
}

const dotColour = (task: Task, theme: AppTheme): string => {
  const band = bandFor(task)
  if (band === 'critical') return theme.colors.danger
  if (band === 'high') return theme.colors.warning
  if (band === 'medium') return theme.colors.accentInk
  return theme.colors.textMuted
}

const clockLabel = (task: Task, timeZone: string): string | null => {
  const anchor = anchorOf(task)
  if (!anchor) return null

  const date = new Date(anchor)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
}

export const PlannerTaskRow = ({
  task,
  timeZone,
  onOpen,
  onComplete,
  onRemove,
}: PlannerTaskRowProps) => {
  const theme = useTheme()
  const done = task.status === 'completed'
  const time = clockLabel(task, timeZone)
  const length = durationLabel(task)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={task.title}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          opacity: done ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColour(task, theme) }]} />

      <View style={styles.body}>
        <Text variant="body" numberOfLines={1} style={done ? styles.struck : null}>
          {emojiFor(task)} {task.title}
        </Text>
        {time || length ? (
          <Text variant="caption" tone="muted">
            {[time, length].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Take ${task.title} off today`}
        onPress={onRemove}
        hitSlop={theme.spacing.sm}
      >
        <Ionicons name="close" size={18} color={theme.colors.textMuted} />
      </Pressable>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `${task.title} is done` : `Mark ${task.title} done`}
        onPress={onComplete}
        hitSlop={theme.spacing.sm}
      >
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={done ? theme.colors.success : theme.colors.border}
        />
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  body: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
})
