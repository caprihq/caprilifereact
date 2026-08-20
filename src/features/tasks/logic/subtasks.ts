import type { Subtask, Task } from '@/types/entities'

/**
 * Pure subtask operations.
 *
 * Ported from web/src/components/tasks/SubtasksSection.jsx, where every one of
 * these was an inline closure inside a 254-line component that also owned two
 * mutations, focus management and the AI call (§3.2, §3.3). Extracted here they
 * are testable and the component becomes presentation.
 *
 * TWO DELIBERATE CHANGES FROM THE WEB VERSION
 *
 * 1. The clock is a parameter. The web version built ids from `Date.now()`
 *    inside the handler (§2.3).
 * 2. Ids cannot collide. `${Date.now()}` alone repeats when two subtasks are
 *    added inside the same millisecond, and since the id is also the React key,
 *    a collision renders the wrong row and edits land on the wrong subtask.
 */

export const subtasksOf = (task: Task): readonly Subtask[] => task.subtasks ?? []

/** Unique within the list: never equal to an id already present. */
export const nextSubtaskId = (subtasks: readonly Subtask[], nowMs: number): string => {
  const taken = new Set(subtasks.map((subtask) => subtask.id))
  let candidate = String(nowMs)
  let suffix = 0
  while (taken.has(candidate)) {
    suffix += 1
    candidate = `${String(nowMs)}-${String(suffix)}`
  }
  return candidate
}

export const addSubtask = (
  subtasks: readonly Subtask[],
  title: string,
  nowMs: number,
): readonly Subtask[] => [
  ...subtasks,
  { id: nextSubtaskId(subtasks, nowMs), title, completed: false },
]

export const toggleSubtask = (
  subtasks: readonly Subtask[],
  id: string,
): readonly Subtask[] =>
  subtasks.map((subtask) =>
    subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask,
  )

/** An empty title is rejected rather than saved, matching the web behaviour. */
export const renameSubtask = (
  subtasks: readonly Subtask[],
  id: string,
  title: string,
): readonly Subtask[] => {
  const trimmed = title.trim()
  if (!trimmed) return subtasks
  return subtasks.map((subtask) => (subtask.id === id ? { ...subtask, title: trimmed } : subtask))
}

export const removeSubtask = (subtasks: readonly Subtask[], id: string): readonly Subtask[] =>
  subtasks.filter((subtask) => subtask.id !== id)

export type SubtaskProgress = {
  readonly completed: number
  readonly total: number
  /** 0–1, and exactly 0 for an empty list so callers never divide by zero. */
  readonly ratio: number
}

export const subtaskProgress = (subtasks: readonly Subtask[]): SubtaskProgress => {
  const total = subtasks.length
  const completed = subtasks.filter((subtask) => subtask.completed).length
  return { completed, total, ratio: total === 0 ? 0 : completed / total }
}

/** Titles from the AI, turned into subtasks with non-colliding ids. */
export const subtasksFromTitles = (
  titles: readonly string[],
  nowMs: number,
): readonly Subtask[] =>
  titles.reduce<readonly Subtask[]>(
    (accumulated, title) => addSubtask(accumulated, title, nowMs),
    [],
  )
