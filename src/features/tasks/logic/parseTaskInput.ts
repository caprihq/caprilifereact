import type { TaskCategory, TaskPriority } from '@/types/entities'
import { TASK_CATEGORIES } from '@/types/entities'

/**
 * Keyword task parsing — pure, offline, deterministic.
 *
 * Lives in `lib/` with no SDK import so it stays testable in isolation
 * (guidelines §3.4). The AI variant that calls Base44 wraps this and falls
 * back to it; see features/tasks/api/aiTaskParser.ts.
 */

export type ParsedTask = {
  readonly title: string
  readonly due_date?: string | undefined
  readonly estimated_minutes?: number | undefined
  readonly category?: TaskCategory | undefined
  readonly priority?: TaskPriority | undefined
}

const DAY_MS = 24 * 60 * 60 * 1000

const relativeDueDate = (text: string, nowMs: number): string | undefined => {
  if (/\btoday\b|\btonight\b/.test(text)) return new Date(nowMs).toISOString()
  if (/\btomorrow\b/.test(text)) return new Date(nowMs + DAY_MS).toISOString()
  if (/\bnext week\b/.test(text)) return new Date(nowMs + 7 * DAY_MS).toISOString()
  return undefined
}

const durationMinutes = (text: string): number | undefined => {
  const match = /(\d+)\s*(min|minute|hour|hr)/.exec(text)
  if (!match?.[1]) return undefined
  const value = Number(match[1])
  return match[2]?.startsWith('h') ? value * 60 : value
}

const urgency = (text: string): TaskPriority | undefined => {
  if (/\burgent\b|\basap\b|\bcritical\b/.test(text)) return 'critical'
  if (/\bimportant\b/.test(text)) return 'high'
  return undefined
}

export const parseTaskHeuristically = (input: string, nowMs: number): ParsedTask => {
  const text = input.toLowerCase()

  return {
    title: input.trim(),
    due_date: relativeDueDate(text, nowMs),
    estimated_minutes: durationMinutes(text),
    category: TASK_CATEGORIES.find((name) => text.includes(name)),
    priority: urgency(text),
  }
}
