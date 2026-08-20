import { View } from 'react-native'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { isLocalPast, isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'

/**
 * The small due-date line under a task title.
 *
 * Wording and colour thresholds match the web client's getDueDateMeta:
 * "Needs attention" for anything past, "Due Today", "Tomorrow", then a
 * relative or absolute date.
 */

type TaskMetaProps = {
  readonly task: Task
  readonly nowMs: number
  readonly timeZone: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export const TaskMeta = ({ task, nowMs, timeZone }: TaskMetaProps) => {
  const theme = useTheme()
  if (!task.due_date) return null

  const due = new Date(task.due_date)
  if (Number.isNaN(due.getTime())) return null

  const label = dueLabel({ iso: task.due_date, due, nowMs, timeZone })
  const tone = isLocalPast(task.due_date, nowMs, timeZone)
    ? 'danger'
    : isLocalToday(task.due_date, nowMs, timeZone)
      ? 'accent'
      : 'muted'

  return (
    <View style={{ marginTop: theme.spacing.xs }}>
      <Text variant="caption" tone={tone}>
        {label}
      </Text>
    </View>
  )
}

type DueLabelInput = {
  readonly iso: string
  readonly due: Date
  readonly nowMs: number
  readonly timeZone: string
}

const dueLabel = ({ iso, due, nowMs, timeZone }: DueLabelInput): string => {
  if (isLocalPast(iso, nowMs, timeZone)) return 'Needs attention'
  if (isLocalToday(iso, nowMs, timeZone)) return 'Due today'

  const days = Math.ceil((due.getTime() - nowMs) / DAY_MS)
  if (days === 1) return 'Tomorrow'
  if (days <= 7) return `In ${String(days)} days`

  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone })
}
