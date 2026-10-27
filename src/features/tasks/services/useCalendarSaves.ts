import { useCallback } from 'react'

import type { Task } from '@/types/entities'
import { syncAfter } from './calendarSync'
import type { TaskUpdate, useTaskCrud } from './useTaskCrud'

/**
 * Saves that keep Google Calendar in step with the task.
 *
 * Each one syncs only after its write lands (see `syncAfter`), because the sync reads
 * the server's copy. Split from useTaskMutations to keep both inside the size limits.
 */

type Crud = ReturnType<typeof useTaskCrud>
type Change = { readonly id: string; readonly data: TaskUpdate }

export const useCalendarSaves = (input: {
  readonly updateTask: Crud['updateTask']
  readonly deleteTask: Crud['deleteTask']
  /** Whether the user's plan includes calendar sync. */
  readonly syncCalendar: boolean
}) => {
  const { updateTask, deleteTask, syncCalendar } = input

  /**
   * Save a change, and copy it to Google Calendar when it moves a block.
   *
   * Only a change to *when* is synced: the sweep skips every event whose time is
   * unchanged, so syncing a renamed task would be a wasted request. Clearing the time
   * counts — the sweep then removes the block from the calendar.
   */
  const saveTask = useCallback(
    (change: Change, movesBlock: boolean) => {
      if (syncCalendar && movesBlock) syncAfter(updateTask.mutateAsync(change))
      else updateTask.mutate(change)
    },
    [updateTask, syncCalendar],
  )

  /**
   * A change to a task that already has a block — a new status, say.
   *
   * Cancelled or saved for later, the block must leave the calendar; undone, it must
   * come back. Synced whenever the task has a block, plan or not: someone who has
   * since downgraded still should not keep a stale hour.
   */
  const saveWithBlock = useCallback(
    (task: Task, data: TaskUpdate) => {
      const change = { id: task.id, data }
      if (task.calendar_event_id) syncAfter(updateTask.mutateAsync(change))
      else updateTask.mutate(change)
    },
    [updateTask],
  )

  /**
   * Delete a task, and its block with it.
   *
   * A deleted task leaves no row for the calendar sync to work from; the sync finds
   * the block from the calendar side instead.
   */
  const removeTask = useCallback(
    (task: Task) => {
      if (task.calendar_event_id) syncAfter(deleteTask.mutateAsync(task.id))
      else deleteTask.mutate(task.id)
    },
    [deleteTask],
  )

  return { saveTask, saveWithBlock, removeTask }
}
