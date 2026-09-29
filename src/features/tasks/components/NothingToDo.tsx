import { View } from 'react-native'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * Home with nothing on it.
 *
 * Replaces two cards that each announced the same absence — "No pending tasks" under
 * Start Here and "No tasks scheduled for today" under Today's Plan — stacked one
 * above the other, under a banner already saying the work was done. Three statements
 * of one fact, and none of them offering the thing to do next.
 *
 * One card, and it carries the action. An empty screen is the moment someone is most
 * likely to be deciding whether the app is worth keeping, so it should hand them the
 * next step rather than describe the void.
 */

type NothingToDoProps = {
  readonly onAddTask: () => void
}

export const NothingToDo = ({ onAddTask }: NothingToDoProps) => {
  const theme = useTheme()

  return (
    <Card>
      <View style={{ paddingVertical: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text variant="heading" align="center">
          Nothing to do
        </Text>
        <Text variant="caption" tone="muted" align="center">
          Add a task and CAPRI will tell you where to start.
        </Text>
        <Button label="Add a task" onPress={onAddTask} />
      </View>
    </Card>
  )
}
