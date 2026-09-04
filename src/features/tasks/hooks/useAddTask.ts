import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import { FREE_LIMITS } from '@/config'
import { parseTaskHeuristically } from '@/features/tasks/logic/parseTaskInput'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { toTaskPatch } from '@/features/tasks/logic/toTaskPatch'
import { fallbackPriority } from '@/features/tasks/logic/priorityFallback'
import { useNow } from '@/hooks/useNow'
import { useTimeZone } from '@/hooks/useTimeZone'
import type { TaskUpdate } from '../services/useTaskCrud'
import { parseTaskWithAI } from '../services/aiTaskParser'
import { prioritiseTask } from '../services/aiPrioritise'
import type { PrioritiseResult } from '../services/aiPrioritise'
import { useTaskMutations } from '../services/useTaskMutations'
import { useTaskFeed } from './useTaskFeed'
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
/**
 * Raw text → structured fields, without saving.
 *
 * Its own hook so `useAddTask` stays inside the body limit (§3.2), and because the
 * two halves of capture are genuinely separate: reading what the user wrote, and
 * deciding what the task is worth.
 */
const useTaskParse = (userEmail: string | null, nowMs: number) => {
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const [parsing, setParsing] = useState(false)

  const parse = useCallback(
    async (input: string): Promise<ParsedTask> => {
      const trimmed = input.trim()
      if (!trimmed) return { title: '' }

      // The AI pass is a paid perk; everyone else still gets useful defaults.
      if (!hasAccess('analytics')) return parseTaskHeuristically(trimmed, nowMs)

      setParsing(true)
      try {
        const outcome = await parseTaskWithAI(trimmed, nowMs, userEmail)

        // Said out loud rather than degraded in silence: the user is watching for
        // CAPRI to have understood them, and a heuristic parse just looks like CAPRI
        // doing a worse job for no reason.
        if (!outcome.usedAI) {
          show({
            message: "CAPRI couldn't read that one. Check the details before saving.",
            tone: 'warning',
          })
        }

        return outcome.draft
      } finally {
        setParsing(false)
      }
    },
    [hasAccess, nowMs, userEmail, show],
  )

  return { parse, parsing }
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
  const { parse, parsing } = useTaskParse(feed.userEmail, nowMs)

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
    async (parsed: ParsedTask, extras: TaskUpdate = {}) => {
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

      onSaved()
    },
    [atFreeLimit, createTask, judge, onSaved, show],
  )

  return {
    parse,
    save,
    parsing,
    atFreeLimit,
    isSaving: prioritising || createTask.isPending,
  }
}
