import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import { FREE_LIMITS } from '@/config'
import { parseTaskHeuristically } from '@/features/tasks/logic/parseTaskInput'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { toTaskPatch } from '@/features/tasks/logic/toTaskPatch'
import { useNow } from '@/hooks/useNow'
import type { Task } from '@/types/entities'
import { parseTaskWithAI } from '../services/aiTaskParser'
import { useTaskMutations } from '../services/useTaskMutations'
import { useTaskFeed } from './useTaskFeed'

/**
 * Capture flow state: parse what the user typed, then save it.
 *
 * Paid users get the LLM parse; free users get the heuristic. The free task
 * cap is enforced here rather than in the screen so the rule lives with the
 * other plan logic.
 */
export const useAddTask = (onSaved: () => void) => {
  const nowMs = useNow()
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const feed = useTaskFeed()
  const { createTask } = useTaskMutations({ userEmail: feed.userEmail, onFeedback: show })

  const [parsing, setParsing] = useState(false)

  const atFreeLimit =
    !hasAccess('unlimited_tasks') && feed.allTasks.length >= FREE_LIMITS.totalTasks

  /** Turn raw text into structured fields, without saving. */
  const parse = useCallback(
    async (input: string): Promise<ParsedTask> => {
      const trimmed = input.trim()
      if (!trimmed) return { title: '' }

      // The AI pass is a paid perk; everyone else still gets useful defaults.
      if (!hasAccess('analytics')) return parseTaskHeuristically(trimmed, nowMs)

      setParsing(true)
      try {
        return await parseTaskWithAI(trimmed, nowMs)
      } finally {
        setParsing(false)
      }
    },
    [hasAccess, nowMs],
  )

  const save = useCallback(
    (parsed: ParsedTask, extras: Partial<Task> = {}) => {
      if (!parsed.title.trim()) return

      if (atFreeLimit) {
        show({
          message: `Free plan is limited to ${String(FREE_LIMITS.totalTasks)} tasks. Upgrade for unlimited.`,
          isError: true,
        })
        return
      }

      createTask.mutate({
        status: 'pending',
        priority: 'medium',
        category: 'personal',
        ...toTaskPatch(parsed),
        ...extras,
      })

      onSaved()
    },
    [atFreeLimit, createTask, onSaved, show],
  )

  return { parse, save, parsing, atFreeLimit, isSaving: createTask.isPending }
}
