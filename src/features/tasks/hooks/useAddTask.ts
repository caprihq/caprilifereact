import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import { FREE_LIMITS } from '@/config'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { toTaskPatch } from '@/features/tasks/logic/toTaskPatch'
import { fallbackPriority } from '@/features/tasks/logic/priorityFallback'
import { useNow } from '@/hooks/useNow'
import { useTimeZone } from '@/hooks/useTimeZone'
import { trackTaskCreated } from '@/services'
import type { CaptureInput } from '@/services/analytics/events'
import type { TaskUpdate } from '../services/useTaskCrud'
import { prioritiseTask } from '../services/aiPrioritise'
import type { PrioritiseResult } from '../services/aiPrioritise'
import { useTaskMutations } from '../services/useTaskMutations'
import { useTaskFeed } from './useTaskFeed'
import { useTaskParse } from './useTaskParse'
import { useUserContext } from './useUserContext'

/**
 * Capture flow state: parse what the user typed, judge it, then save it.
 *
 * Paid users get the LLM parse; free users get the heuristic. The free task
 * cap is enforced here rather than in the screen so the rule lives with the
 * other plan logic.
 *
 * **Every task is now scored on the way in.** It previously was not: a new task was
 * written as a flat `medium` with no `priority_score` and no `priority_reason`, so it
 * sorted below every older task in a list ordered on that score, and its card showed
 * no "why now" line. Paid plans get the model's judgement, calibrated against the
 * user's day; everyone else gets the same local heuristic the web client falls back
 * to, which is also what a failed model call produces here.
 */

/**
 * The model fills what the user left blank; it never overwrites what they set.
 *
 * An explicit priority — theirs from the edit form, or the parser's read of a word
 * like "urgent" — outranks the model's band. The score and the reason are always the
 * model's: nothing else produces them, and the list sorts on the score.
 */
const judged = (draft: ParsedTask, result: PrioritiseResult): TaskUpdate => ({
  ...(draft.priority ? {} : { priority: result.priority }),
  priority_score: result.priority_score,
  priority_reason: result.priority_reason,
  ...(draft.category || !result.suggested_category
    ? {}
    : { category: result.suggested_category }),
  ...(draft.estimated_minutes || !result.suggested_minutes
    ? {}
    : { estimated_minutes: result.suggested_minutes }),
})

/** The heuristic's verdict, respecting an explicit priority the same way. */
const local = (draft: ParsedTask, nowMs: number): TaskUpdate => {
  const guess = fallbackPriority({
    title: draft.title,
    dueDate: draft.due_date,
    category: draft.category,
    nowMs,
  })

  return {
    ...(draft.priority ? {} : { priority: guess.priority }),
    priority_score: guess.priority_score,
  }
}

export const useAddTask = (onSaved: () => void) => {
  const nowMs = useNow()
  const timeZone = useTimeZone()
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const feed = useTaskFeed()
  const { createTask } = useTaskMutations({ userEmail: feed.userEmail, onFeedback: show })
  const contextSummary = useUserContext({ userEmail: feed.userEmail, nowMs, timeZone })

  const [prioritising, setPrioritising] = useState(false)
  const { parse, parsing, parser } = useTaskParse(feed.userEmail, nowMs)

  const atFreeLimit =
    !hasAccess('unlimited_tasks') && feed.allTasks.length >= FREE_LIMITS.totalTasks

  /**
   * What priority this task deserves.
   *
   * Scheduled events are skipped: a commitment happens at a time whether or not it
   * is important, and ranking one alongside work is what the web sheet avoids too.
   */
  const judge = useCallback(
    async (draft: ParsedTask): Promise<TaskUpdate> => {
      if (draft.is_scheduled_event) return {}
      if (!hasAccess('analytics')) return local(draft, nowMs)

      setPrioritising(true)
      try {
        const result = await prioritiseTask({
          title: draft.title,
          description: draft.description,
          category: draft.category,
          dueDate: draft.due_date,
          estimatedMinutes: draft.estimated_minutes,
          userEmail: feed.userEmail,
          nowMs,
          contextSummary,
        })

        // A failed call costs personalisation, not the save.
        return result ? judged(draft, result) : local(draft, nowMs)
      } finally {
        setPrioritising(false)
      }
    },
    [contextSummary, feed.userEmail, hasAccess, nowMs],
  )

  const save = useCallback(
    async (parsed: ParsedTask, input: CaptureInput, extras: TaskUpdate = {}) => {
      if (!parsed.title.trim()) return

      if (atFreeLimit) {
        show({
          message: `Free plan holds ${String(FREE_LIMITS.totalTasks)} tasks. Delete one, or upgrade for unlimited.`,
          tone: 'warning',
        })
        return
      }

      const priority = await judge(parsed)

      createTask.mutate({
        status: 'pending',
        priority: 'medium',
        category: 'personal',
        ...toTaskPatch(parsed),
        ...priority,
        // Last, so a caller that sets a field explicitly still wins.
        ...extras,
      })
      // The feed holds every task the account has, done or not, so a loaded empty one
      // means this is the first.
      const firstForAccount = !feed.isLoading && !feed.isError && feed.allTasks.length === 0
      trackTaskCreated({ input, parser, firstForAccount })

      onSaved()
    },
    [atFreeLimit, createTask, feed, judge, onSaved, parser, show],
  )

  return {
    parse,
    save,
    parsing,
    atFreeLimit,
    isSaving: prioritising || createTask.isPending,
  }
}
