import { useCallback } from 'react'

import { nextRecurrencePatch } from '@/features/tasks/logic/recurrence'
import type { Task, TaskStatus } from '@/types/entities'
import { useTaskCrud } from './useTaskCrud'

/**
 * Task actions the UI calls, built on the optimistic CRUD layer.
 *
 * Ported from web/src/hooks/useTaskMutation.jsx — one of the better-built
 * parts of the web client. Difference: no toast rendering here. Presentation
 * is the caller's job, which keeps this testable and free of JSX (§3.3).
 */

export type MutationFeedback = {
  readonly message: string
  /** Present when the action can be reversed. */
  readonly undo?: (() => void) | undefined
  readonly isError?: boolean
}

type Options = {
  readonly userEmail: string | null
  readonly onFeedback?: (feedback: MutationFeedback) => void
}

export const useTaskMutations = ({ userEmail, onFeedback }: Options) => {
  const reportFailure = useCallback(
    (message: string) => onFeedback?.({ message, isError: true }),
    [onFeedback],
  )

  const { createTask, updateTask, deleteTask } = useTaskCrud(userEmail, reportFailure)

  /** Status change with an undo affordance. */
  const setStatus = useCallback(
    (task: Task, status: TaskStatus, message: string) => {
      const previousStatus = task.status ?? 'pending'
      const completedAt =
        status === 'completed' ? { completed_date: new Date().toISOString() } : {}

      updateTask.mutate({ id: task.id, data: { status, ...completedAt } })

      onFeedback?.({
        message,
        undo: () => updateTask.mutate({ id: task.id, data: { status: previousStatus } }),
      })
    },
    [updateTask, onFeedback],
  )

  /**
   * Completing a recurring task also creates its next occurrence — the web
   * client's spawnNextRecurrence, moved to the one place completion happens so
   * a series cannot silently stop depending on which screen finished it.
   */
  const completeTask = useCallback(
    (task: Task) => {
      setStatus(task, 'completed', 'Marked done ✓')

      const patch = nextRecurrencePatch(task, Date.now())
      if (patch) createTask.mutate(patch)
    },
    [setStatus, createTask],
  )

  return {
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    deferTask: useCallback(
      (task: Task) => setStatus(task, 'saved_for_later', 'Saved for later'),
      [setStatus],
    ),
    cancelTask: useCallback(
      (task: Task) => setStatus(task, 'canceled', 'Removed from today'),
      [setStatus],
    ),
  }
}
