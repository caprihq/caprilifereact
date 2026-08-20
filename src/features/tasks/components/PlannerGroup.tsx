import { View } from 'react-native'

import { Card } from '@/components/Card'
import { Row } from '@/components/Row'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { Task } from '@/types/entities'

/** One planner section. Renders nothing when the group is empty. */
export const PlannerGroup = ({
  title,
  tasks,
  timeZone,
  onOpen,
}: {
  readonly title: string
  readonly tasks: readonly Task[]
  readonly timeZone: string
  readonly onOpen: (task: Task) => void
}) => {
  const theme = useTheme()
  if (tasks.length === 0) return null

  return (
    <View>
      <Text variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
        {title}
      </Text>
      <Card flush>
        {tasks.map((task, index) => (
          <Row
            key={task.id}
            label={task.title}
            value={timeLabel(task, timeZone)}
            onPress={() => onOpen(task)}
            last={index === tasks.length - 1}
          />
        ))}
      </Card>
    </View>
  )
}

const timeLabel = (task: Task, timeZone: string): string | undefined => {
  const iso = task.scheduled_start_time ?? task.due_date
  if (!iso) return undefined

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined

  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
}
