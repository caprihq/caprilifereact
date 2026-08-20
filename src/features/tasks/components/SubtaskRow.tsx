import { useState } from 'react'
import { size } from '@/theme'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { Subtask } from '@/types/entities'

/**
 * One step in a task's checklist.
 *
 * Presentational: every change is reported upward. Tapping the title starts an
 * inline edit, which commits on blur or submit and discards on cancel — the
 * same interaction the web row had, minus the hover-only delete button, which
 * is unreachable on a touch screen.
 */

type SubtaskRowProps = {
  readonly subtask: Subtask
  readonly editing: boolean
  readonly onToggle: () => void
  readonly onStartEditing: () => void
  readonly onRename: (title: string) => void
  readonly onRemove: () => void
}

export const SubtaskRow = ({
  subtask,
  editing,
  onToggle,
  onStartEditing,
  onRename,
  onRemove,
}: SubtaskRowProps) => {
  const theme = useTheme()
  const [draft, setDraft] = useState(subtask.title)

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: subtask.completed ? theme.colors.background : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.md,
          gap: theme.spacing.md,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: subtask.completed }}
        accessibilityLabel={subtask.title}
        hitSlop={theme.spacing.sm}
      >
        <Ionicons
          name={subtask.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={subtask.completed ? theme.colors.success : theme.colors.textMuted}
        />
      </Pressable>

      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={() => onRename(draft)}
          onSubmitEditing={() => onRename(draft)}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          accessibilityLabel="Step title"
          style={[
            styles.input,
            { color: theme.colors.textPrimary, fontSize: theme.fontSize.md },
          ]}
        />
      ) : (
        <Pressable style={styles.input} onPress={onStartEditing} accessibilityRole="button">
          <Text
            variant="body"
            tone={subtask.completed ? 'muted' : 'primary'}
            style={subtask.completed ? styles.struck : undefined}
          >
            {subtask.title}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${subtask.title}`}
        hitSlop={theme.spacing.sm}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.tapTarget,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
})
