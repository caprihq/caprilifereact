import { useCallback } from 'react'

import { nextRecurrencePatch } from '@/features/tasks/logic/recurrence'
import { windowForSlot } from '@/features/tasks/logic/timeSlots'
import type { SlotKey } from '@/features/tasks/logic/timeSlots'
import type { FeedbackTone } from '@/store'
import type { Task, TaskStatus } from '@/types/entities'
import { useTaskCrud } from './useTaskCrud'
import type { TaskUpdate } from './useTaskCrud'

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
  readonly tone?: FeedbackTone | undefined
}

type Options = {
  readonly userEmail: string | null
  readonly onFeedback?: (feedback: MutationFeedback) => void
}

/**
 * Nulls, not omissions: Base44 clears a field it is sent `null` for, and ignores one
 * that is absent. Omitting these would make "remove from today" a silent no-op.
 */
const CLEARED_SCHEDULE: TaskUpdate = {
  due_date: null,
  scheduled_start_time: null,
  scheduled_end_time: null,
}

/** What the task had before, so undo restores rather than reconstructs. */
const restoredSchedule = (task: Task): TaskUpdate => ({
  due_date: task.due_date ?? null,
  scheduled_start_time: task.scheduled_start_time ?? null,
  scheduled_end_time: task.scheduled_end_time ?? null,
})

export const useTaskMutations = ({ userEmail, onFeedback }: Options) => {
  const reportFailure = useCallback(
    (message: string) => onFeedback?.({ message, tone: 'error' }),
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
        tone: 'success',
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

  /**
   * Put a task into one of today's time blocks.
   *
   * Writes `due_date`, `scheduled_start_time` and `scheduled_end_time` together, as
   * the web client does. They are read by different views — the planner places by
   * the scheduled pair, Today's Plan also accepts a due date — so writing one
   * without the others leaves a task visible in one place and missing from another.
   */
  const scheduleInSlot = useCallback(
    (task: Task, slot: SlotKey, when: { readonly nowMs: number; readonly timeZone: string }) => {
      updateTask.mutate({
        id: task.id,
        data: windowForSlot(task, slot, when),
      })
      onFeedback?.({
        message: 'Added to your day.',
        tone: 'success',
        undo: () => {
          updateTask.mutate({ id: task.id, data: CLEARED_SCHEDULE })
        },
      })
    },
    [updateTask, onFeedback],
  )

  /**
   * Take a task back off the day.
   *
   * Clears all three fields, which is what the web client's "remove from day" does.
   * The undo restores exactly what was there before rather than a reconstruction,
   * because a task may have carried a due date that had nothing to do with the block
   * it was sitting in.
   */
  const removeFromDay = useCallback(
    (task: Task) => {
      updateTask.mutate({ id: task.id, data: CLEARED_SCHEDULE })
      onFeedback?.({
        message: 'Removed from today.',
        tone: 'success',
        undo: () => {
          updateTask.mutate({ id: task.id, data: restoredSchedule(task) })
        },
      })
    },
    [updateTask, onFeedback],
  )

  return {
    createTask,
    updateTask,
    deleteTask,
    scheduleInSlot,
    removeFromDay,
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
