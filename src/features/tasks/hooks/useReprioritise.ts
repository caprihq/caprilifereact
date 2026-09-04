import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import type { Task } from '@/types/entities'
import { reprioritiseTask } from '../services/aiReprioritise'
import { useTaskMutations } from '../services/useTaskMutations'

/**
 * "Re-prioritise with CAPRI" on the task detail screen.
 *
 * Writes all three fields the model returns — `priority`, `priority_score` and
 * `priority_reason` — because the list ranks on the first two and the card shows the
 * third. Writing the label without the score leaves the list ordering the task by a
 * stale number, which looks like the button did nothing.
 *
 * The undo restores the previous three, so a judgement the user disagrees with costs
 * one tap rather than a manual correction of each field.
 */
export const useReprioritise = (task: Task, userEmail: string | null) => {
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const { updateTask } = useTaskMutations({ userEmail, onFeedback: show })
  const [running, setRunning] = useState(false)

  const run = useCallback(async () => {
    if (running) return

    /**
     * Gated here as well as in the component. `TaskDetailActions` decides whether to
     * offer the button or an upgrade prompt; that is presentation. This is the check
     * that actually stops a paid model call, and it does not depend on every future
     * caller remembering to ask first.
     */
    if (!hasAccess('analytics')) {
      show({
        message: 'Re-prioritising comes with Executive. Upgrade to let CAPRI re-judge a task.',
        tone: 'warning',
      })
      return
    }

    setRunning(true)

    const result = await reprioritiseTask(task, userEmail)
    setRunning(false)

    if (result.kind === 'error') {
      show({ message: result.message, tone: 'error' })
      return
    }

    const previous = {
      priority: task.priority ?? null,
      priority_score: task.priority_score ?? null,
      priority_reason: task.priority_reason ?? null,
    }

    updateTask.mutate({
      id: task.id,
      data: {
        priority: result.priority,
        priority_score: result.priority_score,
        priority_reason: result.priority_reason,
      },
    })

    show({
      message: `Now ${result.priority} priority.`,
      tone: 'success',
      undo: () => {
        updateTask.mutate({ id: task.id, data: previous })
      },
    })
  }, [hasAccess, running, show, task, updateTask, userEmail])

  return { run, running }
}
