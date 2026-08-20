import { useCallback } from 'react'
import { Alert, View } from 'react-native'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { Task } from '@/types/entities'

/**
 * Destructive and terminal actions for a task, kept apart from the edit form
 * so neither grows past the size limits.
 */

type TaskDetailActionsProps = {
  readonly task: Task
  readonly onComplete: () => void
  readonly onDelete: () => void
}

export const TaskDetailActions = ({ task, onComplete, onDelete }: TaskDetailActionsProps) => {
  const theme = useTheme()

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }, [onDelete])

  return (
    <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
      {task.status === 'completed' ? (
        <Text variant="caption" tone="muted" align="center">
          Completed
        </Text>
      ) : (
        <Button label="Mark done" variant="secondary" onPress={onComplete} />
      )}

      <Button label="Delete task" variant="ghost" onPress={confirmDelete} />
    </View>
  )
}
