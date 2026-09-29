import { Pressable, ScrollView, StyleSheet } from 'react-native'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { CategoryIcon } from './CategoryIcon'
import type { Task } from '@/types/entities'

/**
 * The list of tasks that can be dropped into a block.
 *
 * Offers anything not finished and not already on today, matching the web client's
 * picker. Capped in height so a long backlog cannot push the block it belongs to off
 * the screen.
 */

type SlotTaskPickerProps = {
  readonly tasks: readonly Task[]
  readonly onPick: (task: Task) => void
}

export const SlotTaskPicker = ({ tasks, onPick }: SlotTaskPickerProps) => {
  const theme = useTheme()

  if (tasks.length === 0) {
    return (
      <Card>
        <Text variant="caption" tone="muted" align="center">
          Nothing left to schedule.
        </Text>
      </Card>
    )
  }

  return (
    <Card flush>
      <ScrollView style={styles.capped} nestedScrollEnabled>
        {tasks.map((task, index) => (
          <Pressable
            key={task.id}
            accessibilityRole="button"
            accessibilityLabel={`Schedule ${task.title}`}
            onPress={() => onPick(task)}
            style={({ pressed }) => [
              {
                padding: theme.spacing.md,
                backgroundColor: pressed ? theme.colors.fill : 'transparent',
                borderBottomWidth: index === tasks.length - 1 ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <Text variant="body" numberOfLines={1}>
              <CategoryIcon task={task} /> {task.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Card>
  )
}

const styles = StyleSheet.create({
  /** ~4 rows: enough to choose from without burying the block below it. */
  capped: { maxHeight: 200 },
})
