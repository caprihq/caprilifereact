import { useCallback, useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'

import { useFeedback } from '@/hooks/useFeedback'
import { track } from '@/services'
import { recordIgnored, recordInteraction } from '../logic/signalsStore'
import type { AppNavigation } from '@/navigation/types'
import {
  COMPLETION_CONFIRM_LABEL,
  COMPLETION_ICON,
  COMPLETION_MESSAGE,
  completionTitle,
} from '../logic/completionPrompt'
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
export const useHomeActions = (feed: TaskFeed, displayedHeroId?: string | null) => {
  const navigation = useNavigation<AppNavigation>()
  const { show } = useFeedback()
  const { completeTask, deferTask, cancelTask } = useTaskMutations({
    userEmail: feed.userEmail,
    onFeedback: show,
  })

  /**
   * Which task is on screen as "Start Here".
   *
   * Passed in by Home, because the hero shown there is CAPRI's pick and the local
   * ranking's pick only until the model answers. Reading `feed.heroTask` here would
   * mean skipping the recommended task records nothing whenever the two disagree —
   * silently, and precisely for the users whose recommendation is model-driven.
   */
  const heroId = displayedHeroId === undefined ? feed.heroTask?.id : displayedHeroId
  const nowMs = feed.nowMs

  /**
   * Completion asks first.
   *
   * It was a single tap on a small circle, and the only way back was an undo toast
   * that is gone in seconds — so a mis-tap quietly finished someone's work. Marking
   * something done is the one action here that claims a thing happened in the real
   * world, which is worth a question.
   *
   * Deferring and cancelling stay immediate: both are reversible in place, and
   * confirming every swipe would make the gesture pointless.
   */
  const [pending, setPending] = useState<Task | null>(null)

  const confirmCompletion = useCallback(() => {
    if (pending) {
      completeTask(pending)
      // Whether the hero specifically gets done is the product's central question:
      // CAPRI's whole claim is that it picks the right next thing.
      track(
        heroId === pending.id
          ? { name: 'start_here_completed', params: { source: 'home' } }
          : { name: 'task_completed', params: { source: 'home' } },
      )
    }
    setPending(null)
  }, [completeTask, heroId, pending])

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
      if (heroId !== task.id) return
      recordIgnored(task.id)
      // The other half of the same question. Completed-versus-skipped on the hero is
      // the one ratio that says whether the recommendation is any good.
      track({ name: 'start_here_skipped', params: { source: 'home' } })
    },
    [heroId],
  )

  const actions: TaskActions = useMemo(
    () => ({
      onOpen: openTask,
      onComplete: setPending,
      onDefer: (task: Task) => {
        noteSkipped(task)
        deferTask(task)
      },
      onCancel: (task: Task) => {
        noteSkipped(task)
        cancelTask(task)
      },
      onViewPlan: () => navigation.navigate('Planner'),
      onAddTask: () => navigation.navigate('AddTask'),
    }),
    [openTask, deferTask, cancelTask, noteSkipped, navigation],
  )

  /** Spread onto `ConfirmDialog` by whichever screen renders these actions. */
  const completionPrompt = {
    open: pending !== null,
    title: completionTitle(pending),
    message: COMPLETION_MESSAGE,
    confirmLabel: COMPLETION_CONFIRM_LABEL,
    icon: COMPLETION_ICON,
    onConfirm: confirmCompletion,
    onCancel: () => {
      setPending(null)
    },
  }

  return { ...actions, completionPrompt }
}
