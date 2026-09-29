import type { ParsedTask } from './parseTaskInput'

/**
 * What a task must have before it can be saved.
 *
 * A scheduled event with no start time is the case this exists for. It has no anchor,
 * so Today's Commitments drops it, Today's Plan drops it, and the ranking has already
 * excluded it for being an event: the task is saved, exists, and appears nowhere. The
 * form defaults a time to make that unlikely; this makes it impossible.
 *
 * Returns problems rather than a boolean, so the screen can say which field is wrong
 * and why instead of only greying out the button.
 *
 * Pure, so every rule is a unit test rather than something to reproduce by hand.
 */

export type TaskField = 'title' | 'scheduled_start_time'

export type TaskProblem = {
  readonly field: TaskField
  /** Written for the person reading it, not for the log. */
  readonly message: string
}

const hasUsableTime = (iso: string | undefined): boolean => {
  if (!iso) return false

  return !Number.isNaN(new Date(iso).getTime())
}

export const taskProblems = (draft: ParsedTask): readonly TaskProblem[] => {
  const problems: TaskProblem[] = []

  if (!draft.title.trim()) {
    problems.push({ field: 'title', message: 'Give this a name.' })
  }

  // Only events need a time. An ordinary task is scheduled by CAPRI, so having none
  // is the normal state rather than a mistake.
  if (draft.is_scheduled_event && !hasUsableTime(draft.scheduled_start_time)) {
    problems.push({
      field: 'scheduled_start_time',
      message: 'A scheduled event needs a start time.',
    })
  }

  return problems
}

/** Whether the form may be submitted at all. */
export const canSaveTask = (draft: ParsedTask): boolean => taskProblems(draft).length === 0
