import type { TaskCategory, TaskPriority } from '@/types/entities'
import { bandForScore } from './priorityBand'

/**
 * Priority without the model.
 *
 * Ported from the web client's `determinePriorityFallback`. It is what a free-plan
 * task gets, and what a paid task gets when the model call fails — the alternative
 * being every new task saved as a flat `medium` with no score, which is what this app
 * did until now. That matters beyond the badge: the list sorts on `priority_score`,
 * so a task with none sinks below everything, however urgent it is.
 *
 * The weights are the web's, unchanged. They are crude on purpose: a keyword read
 * plus a due-date read, biased so that anything the user called urgent or that is
 * already overdue lands in the top band.
 */

export type FallbackPriority = {
  readonly priority: TaskPriority
  readonly priority_score: number
}

/** Words people actually use when something cannot wait. */
const URGENT = /urgent|asap|critical|emergency|deadline|overdue/
const NOTABLE = /important|must|need|required|today/

/** Categories that carry consequences, so they get a nudge. */
const WEIGHTED_CATEGORIES: readonly string[] = ['work', 'finance', 'health']

const BASE_SCORE = 30
const DAY_MS = 24 * 60 * 60 * 1000

const languageBonus = (title: string): number => {
  const text = title.toLowerCase()
  if (URGENT.test(text)) return 40
  if (NOTABLE.test(text)) return 20
  return 0
}

const deadlineBonus = (dueDate: string | undefined, nowMs: number): number => {
  if (!dueDate) return 0

  const days = (new Date(dueDate).getTime() - nowMs) / DAY_MS
  if (Number.isNaN(days)) return 0
  if (days < 0) return 45
  if (days < 1) return 35
  if (days < 3) return 20
  if (days < 7) return 10
  return 0
}

export const fallbackPriority = (input: {
  readonly title: string
  readonly dueDate: string | undefined
  readonly category: TaskCategory | undefined
  readonly nowMs: number
}): FallbackPriority => {
  const score = Math.min(
    100,
    BASE_SCORE +
      languageBonus(input.title) +
      deadlineBonus(input.dueDate, input.nowMs) +
      (input.category && WEIGHTED_CATEGORIES.includes(input.category) ? 10 : 0),
  )

  return { priority: bandForScore(score), priority_score: score }
}
