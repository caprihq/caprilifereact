import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { SubtaskProgress } from '@/features/tasks/logic/subtasks'
import type { Subtask } from '@/types/entities'
import { SubtaskRow } from './SubtaskRow'

/**
 * A task's checklist, with AI breakdown.
 *
 * Presentational — all state and I/O live in useSubtaskEditor (§3.3). Subtasks
 * are an Executive feature, so free users get the upgrade path instead.
 */

type SubtasksSectionProps = {
  readonly subtasks: readonly Subtask[]
  readonly progress: SubtaskProgress
  readonly locked: boolean
  readonly generating: boolean
  readonly editingId: string | null
  readonly onToggle: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onRename: (id: string, title: string) => void
  readonly onStartEditing: (id: string) => void
  readonly onAdd: () => void
  readonly onGenerate: () => void
  readonly onUpgrade: () => void
}

export const SubtasksSection = (props: SubtasksSectionProps) => {
  const theme = useTheme()
  const { subtasks, progress, locked, generating, editingId } = props

  if (locked) {
    return (
      <View style={{ gap: theme.spacing.sm }}>
        <Button label="Help me break this down" onPress={props.onUpgrade} />
        <Text variant="caption" tone="muted" align="center">
          Steps are part of CAPRI Executive Assistant.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      {subtasks.length > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          <View style={styles.header}>
            <Text variant="label" tone="secondary">
              Steps {progress.completed}/{progress.total}
            </Text>
            <View style={[styles.header, { gap: theme.spacing.lg }]}>
              <Pressable
                onPress={props.onAdd}
                accessibilityRole="button"
                accessibilityLabel="Add a step"
                hitSlop={theme.spacing.sm}
              >
                <Ionicons name="add" size={20} color={theme.colors.accentInk} />
              </Pressable>
              <Pressable
                onPress={props.onGenerate}
                disabled={generating}
                accessibilityRole="button"
                accessibilityLabel="Regenerate steps with AI"
                hitSlop={theme.spacing.sm}
              >
                <Ionicons name="refresh" size={18} color={theme.colors.accentInk} />
              </Pressable>
            </View>
          </View>

          {/* Flex weights rather than a percentage width: a percentage needs a
              `${number}%` literal, which collides with the lint rule requiring
              String() inside templates. */}
          <View
            style={[styles.track, { backgroundColor: theme.colors.border }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: progress.total, now: progress.completed }}
          >
            <View style={{ flex: progress.completed, backgroundColor: theme.colors.accent }} />
            <View style={{ flex: progress.total - progress.completed }} />
          </View>
        </View>
      ) : null}

      {generating ? (
        <View style={[styles.busy, { gap: theme.spacing.sm, minHeight: size.tapTarget }]}>
          <ActivityIndicator color={theme.colors.accentInk} />
          <Text variant="caption" tone="muted">
            Breaking it down…
          </Text>
        </View>
      ) : null}

      {subtasks.length === 0 && !generating ? (
        <Button label="Break this into steps" onPress={props.onGenerate} />
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        {subtasks.map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            editing={editingId === subtask.id}
            onToggle={() => props.onToggle(subtask.id)}
            onStartEditing={() => props.onStartEditing(subtask.id)}
            onRename={(title) => props.onRename(subtask.id, title)}
            onRemove={() => props.onRemove(subtask.id)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
})
