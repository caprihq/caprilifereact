import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import {
  addSubtask,
  removeSubtask,
  renameSubtask,
  subtaskProgress,
  subtasksOf,
  toggleSubtask,
} from '@/features/tasks/logic/subtasks'
import { useNow } from '@/hooks/useNow'
import type { Subtask, Task } from '@/types/entities'
import { generateSubtasks } from '../services/aiSubtasks'
import { useTaskCrud } from '../services/useTaskCrud'

/**
 * Everything the subtasks UI needs, so the component stays presentation.
 *
 * The web version put all of this — two mutations, the AI call, edit state and
 * focus handling — inside one 254-line component (§3.2, §3.3).
 *
 * Writes go through the shared optimistic CRUD layer, so a checkbox ticks
 * immediately and rolls back if the server rejects it.
 */

const NEW_SUBTASK_TITLE = 'New step'

export const useSubtaskEditor = (task: Task, userEmail: string | null) => {
  const nowMs = useNow()
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const { updateTask } = useTaskCrud(userEmail, (message) => show({ message, isError: true }))
  const [generating, setGenerating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const subtasks = subtasksOf(task)

  const write = useCallback(
    (next: readonly Subtask[]) => {
      updateTask.mutate({ id: task.id, data: { subtasks: next } })
    },
    [updateTask, task.id],
  )

  const generate = useCallback(async () => {
    setGenerating(true)
    try {
      const result = await generateSubtasks(task, userEmail, Date.now())
      if (result.kind === 'error') {
        show({ message: result.message, isError: true })
        return
      }
      write(result.subtasks)
    } finally {
      setGenerating(false)
    }
  }, [task, userEmail, show, write])

  const add = useCallback(() => {
    const next = addSubtask(subtasks, NEW_SUBTASK_TITLE, Date.now())
    write(next)
    // Open the new row for editing straight away, matching the web behaviour.
    setEditingId(next[next.length - 1]?.id ?? null)
  }, [subtasks, write])

  return {
    subtasks,
    progress: subtaskProgress(subtasks),
    /** Subtasks are an Executive feature; free users see an upgrade prompt. */
    locked: !hasAccess('subtasks'),
    generating,
    editingId,
    nowMs,
    startEditing: setEditingId,
    stopEditing: useCallback(() => setEditingId(null), []),
    toggle: useCallback((id: string) => write(toggleSubtask(subtasks, id)), [subtasks, write]),
    remove: useCallback((id: string) => write(removeSubtask(subtasks, id)), [subtasks, write]),
    rename: useCallback(
      (id: string, title: string) => {
        write(renameSubtask(subtasks, id, title))
        setEditingId(null)
      },
      [subtasks, write],
    ),
    add,
    generate,
  }
}
