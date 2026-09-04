import type { Task } from '@/types/entities'

/**
 * The small facts a task card shows, worked out once.
 *
 * Pure so the rules can be tested without a renderer, and shared so the list, the
 * planner and the hero cannot disagree about what a task's priority or category
 * looks like — which is what happened in the web client, where three components
 * each kept their own copy of these maps.
 */

/** Category glyphs, matching the web client so the two apps read alike. */
const CATEGORY_EMOJI: Readonly<Record<string, string>> = {
  work: '💼',
  personal: '🏠',
  health: '💪',
  finance: '💰',
  learning: '📚',
  errands: '🛒',
  social: '👥',
}

/** Takes only what it reads, so an unsaved draft can be shown with the same glyph. */
export const emojiFor = (task: { readonly category?: string | undefined }): string =>
  CATEGORY_EMOJI[task.category ?? ''] ?? '📌'

export type PriorityBand = 'critical' | 'high' | 'medium' | 'low'

export const bandFor = (task: Task): PriorityBand => {
  const priority = task.priority
  return priority === 'critical' || priority === 'high' || priority === 'low' ? priority : 'medium'
}

export const PRIORITY_LABEL: Readonly<Record<PriorityBand, string>> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

/**
 * The one line of explanation under a title.
 *
 * `priority_reason` wins over `description`: it is CAPRI's answer to "why is this
 * in front of me", which is the product's whole claim, and a description the user
 * wrote is available on the detail screen anyway.
 */
export const subtitleFor = (task: Task): { readonly text: string; readonly isReason: boolean } | null => {
  const reason = task.priority_reason?.trim()
  if (reason) return { text: reason, isReason: true }

  const description = task.description?.trim()
  return description ? { text: description, isReason: false } : null
}

/** "2/5" once there are subtasks, so progress is visible without opening the task. */
export const subtaskProgress = (task: Task): string | null => {
  const subtasks = task.subtasks ?? []
  if (subtasks.length === 0) return null

  const done = subtasks.filter((subtask) => subtask.completed).length
  return `${String(done)}/${String(subtasks.length)}`
}

/** Minutes as the card shows them: "45m", "1h", "1h 30m". */
export const durationLabel = (task: {
  readonly estimated_minutes?: number | undefined
}): string | null => {
  const minutes = task.estimated_minutes
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${String(minutes)}m`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`
}
