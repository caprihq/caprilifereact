import { useCallback, useMemo, useState } from 'react'

import { useTodayTimeline } from '@/features/commitments'
import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import { filterDailyPlannerTasks } from '../logic/plannerLogic'
import { schedulableTasks } from '../logic/timeSlots'
import type { SlotKey } from '../logic/timeSlots'
import { buildUnifiedDay } from '../logic/unifiedDay'
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
 * The planner's day: what sits in each block — tasks and the commitments around
 * them — what still needs a time, and what carried over, plus the actions that move
 * tasks between those states.
 *
 * Extracted so the screen stays a composition (§3.2/§3.3) and so the grouping can be
 * reasoned about in one place. The rules themselves are pure and tested in
 * `plannerLogic` and `timeSlots`; this only wires them to the feed and mutations.
 */
export const usePlannerDay = (feed: TaskFeed) => {
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const { completeTask, scheduleInSlot, removeFromDay } = useTaskMutations({
    userEmail: feed.userEmail,
    onFeedback: show,
    // A block added by hand reaches Google Calendar, as an accepted suggestion does.
    syncCalendar: hasAccess('calendar_sync'),
  })
  // Shares its queries with Home's Today's Commitments, so this costs no requests.
  const timeline = useTodayTimeline({
    userEmail: feed.userEmail,
    tasks: feed.allTasks,
    nowMs: feed.nowMs,
    timeZone: feed.timeZone,
  })

  const [openPicker, setOpenPicker] = useState<SlotKey | null>(null)
  /** Completion asks before it happens — see `useHomeActions` for the reasoning. */
  const [pendingCompletion, setPendingCompletion] = useState<Task | null>(null)

  const when = useMemo(
    () => ({ nowMs: feed.nowMs, timeZone: feed.timeZone }),
    [feed.nowMs, feed.timeZone],
  )

  const timelineItems = timeline.items
  const day = useMemo(() => {
    const plan = filterDailyPlannerTasks(feed.allTasks, when)

    return {
      ...plan,
      ...buildUnifiedDay({ tasks: plan.todayScheduled, fixed: timelineItems, timeZone: when.timeZone }),
      candidates: schedulableTasks(feed.allTasks, when),
    }
  }, [feed.allTasks, timelineItems, when])

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
