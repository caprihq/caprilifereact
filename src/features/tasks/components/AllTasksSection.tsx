import { useMemo, useState } from 'react'
import { View } from 'react-native'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { applyTaskFilter, emptyMessageFor } from '@/features/tasks/logic/taskFilters'
import type { TaskFilter } from '@/features/tasks/logic/taskFilters'
import { computeTaskStats } from '@/features/tasks/logic/taskStats'
import type { Task } from '@/types/entities'
import { FilterBar } from './FilterBar'
import { QuickStats } from './QuickStats'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { SwipeableTaskRow } from './SwipeableTaskRow'
import { TaskMeta } from './TaskMeta'
import type { TaskActions } from './HomeSections'

/**
 * The full task list with its filter chips and headline counts — the part of
 * the web Home screen that had no native equivalent.
 *
 * Filter state is local: it is a view preference, not server data, and nothing
 * outside this section reads it (§3.6).
 */

type AllTasksSectionProps = {
  readonly tasks: readonly Task[]
  readonly nowMs: number
  readonly timeZone: string
  readonly actions: TaskActions
  /** Counts are an Executive feature; hidden rather than teased for free users. */
  readonly showStats: boolean
}

export const AllTasksSection = ({
  tasks,
  nowMs,
  timeZone,
  actions,
  showStats,
}: AllTasksSectionProps) => {
  const theme = useTheme()
  const [filter, setFilter] = useState<TaskFilter>('all')

  const { visible, stats } = useMemo(
    () => ({
      visible: applyTaskFilter(tasks, filter, { nowMs, timeZone }),
      stats: computeTaskStats(tasks, { nowMs, timeZone }),
    }),
    [tasks, filter, nowMs, timeZone],
  )

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SectionLabel>All Tasks</SectionLabel>

      {showStats ? <QuickStats stats={stats} /> : null}

      <FilterBar active={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <Card>
          <Text variant="body" tone="muted" align="center">
            {emptyMessageFor(filter)}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {visible.map((task) => (
            <SwipeableTaskRow
              key={task.id}
              completed={task.status === 'completed'}
              onPress={() => actions.onOpen(task)}
              onComplete={() => actions.onComplete(task)}
              onDefer={() => actions.onDefer(task)}
              onCancel={() => actions.onCancel(task)}
            >
              <Text variant="bodyStrong" numberOfLines={2}>
                {task.title}
              </Text>
              <TaskMeta task={task} nowMs={nowMs} timeZone={timeZone} />
            </SwipeableTaskRow>
          ))}
        </View>
      )}
    </View>
  )
}
