import { useCallback, useMemo } from 'react'
import { useNavigation } from '@react-navigation/native'

import { useFeedback } from '@/hooks/useFeedback'
import { recordIgnored, recordInteraction } from '../logic/signalsStore'
import type { AppNavigation } from '@/navigation/types'
import type { Task } from '@/types/entities'
import { useTaskMutations } from '../services/useTaskMutations'
import type { TaskActions } from '../components/HomeSections'
import type { TaskFeed } from './useTaskFeed'

/**
 * The Home screen's task actions, including the behavioural signals they record.
 *
 * Extracted so the screen stays inside the 80-line body limit (§3.2) and so the
 * signal recording sits next to the action that causes it rather than being
 * scattered through JSX.
 */
export const useHomeActions = (feed: TaskFeed): TaskActions => {
  const navigation = useNavigation<AppNavigation>()
  const { show } = useFeedback()
  const { completeTask, deferTask, cancelTask } = useTaskMutations({
    userEmail: feed.userEmail,
    onFeedback: show,
  })

  const heroId = feed.heroTask?.id
  const nowMs = feed.nowMs

  const openTask = useCallback(
    (task: Task) => {
      recordInteraction(task.id, nowMs)
      navigation.navigate('TaskDetail', { taskId: task.id })
    },
    [navigation, nowMs],
  )

  /**
   * Passing over the recommended task is the "ignored" signal behind the
   * scorer's −0.5 penalty. Nothing recorded it before, so a third of the
   * behavioural inputs could never fire and CAPRI kept re-recommending a task
   * the user had already pushed away three times.
   */
  const noteSkipped = useCallback(
    (task: Task) => {
      if (heroId === task.id) recordIgnored(task.id)
    },
    [heroId],
  )

  return useMemo(
    () => ({
      onOpen: openTask,
      onComplete: completeTask,
      onDefer: (task: Task) => {
        noteSkipped(task)
        deferTask(task)
      },
      onCancel: (task: Task) => {
        noteSkipped(task)
        cancelTask(task)
      },
      onViewPlan: () => navigation.navigate('Planner'),
    }),
    [openTask, completeTask, deferTask, cancelTask, noteSkipped, navigation],
  )
}
