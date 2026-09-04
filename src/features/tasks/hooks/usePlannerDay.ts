import { useCallback, useMemo, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { filterDailyPlannerTasks } from '../logic/plannerLogic'
import { TIME_SLOTS, schedulableTasks, slotKeyFor } from '../logic/timeSlots'
import type { SlotKey } from '../logic/timeSlots'
import { useTaskMutations } from '../services/useTaskMutations'
import type { TaskFeed } from './useTaskFeed'
import {
  COMPLETION_CONFIRM_LABEL,
  COMPLETION_ICON,
  COMPLETION_MESSAGE,
  completionTitle,
} from '../logic/completionPrompt'
import type { Task } from '@/types/entities'

/**
 * The planner's day: what sits in each block, what still needs a time, and what
 * carried over — plus the actions that move tasks between those states.
 *
 * Extracted so the screen stays a composition (§3.2/§3.3) and so the grouping can be
 * reasoned about in one place. The rules themselves are pure and tested in
 * `plannerLogic` and `timeSlots`; this only wires them to the feed and mutations.
 */
export const usePlannerDay = (feed: TaskFeed) => {
  const { show } = useFeedback()
  const { completeTask, scheduleInSlot, removeFromDay } = useTaskMutations({
    userEmail: feed.userEmail,
    onFeedback: show,
  })

  const [openPicker, setOpenPicker] = useState<SlotKey | null>(null)
  /** Completion asks before it happens — see `useHomeActions` for the reasoning. */
  const [pendingCompletion, setPendingCompletion] = useState<Task | null>(null)

  const when = useMemo(
    () => ({ nowMs: feed.nowMs, timeZone: feed.timeZone }),
    [feed.nowMs, feed.timeZone],
  )

  const day = useMemo(() => {
    const plan = filterDailyPlannerTasks(feed.allTasks, when)

    return {
      ...plan,
      blocks: TIME_SLOTS.map((slot) => ({
        slot,
        tasks: plan.todayScheduled.filter((task) => slotKeyFor(task, when.timeZone) === slot.key),
      })),
      candidates: schedulableTasks(feed.allTasks, when),
    }
  }, [feed.allTasks, when])

  const schedule = useCallback(
    (task: Task, slot: SlotKey) => {
      scheduleInSlot(task, slot, when)
      setOpenPicker(null)
    },
    [scheduleInSlot, when],
  )

  const togglePicker = useCallback((slot: SlotKey) => {
    setOpenPicker((current) => (current === slot ? null : slot))
  }, [])

  const completionPrompt = {
    open: pendingCompletion !== null,
    title: completionTitle(pendingCompletion),
    message: COMPLETION_MESSAGE,
    confirmLabel: COMPLETION_CONFIRM_LABEL,
    icon: COMPLETION_ICON,
    onConfirm: () => {
      if (pendingCompletion) completeTask(pendingCompletion)
      setPendingCompletion(null)
    },
    onCancel: () => {
      setPendingCompletion(null)
    },
  }

  return {
    day,
    openPicker,
    togglePicker,
    schedule,
    completeTask: setPendingCompletion,
    removeFromDay,
    completionPrompt,
  }
}
