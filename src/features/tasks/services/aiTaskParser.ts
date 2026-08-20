import { base44 } from '@/services/api'
import { parseTaskHeuristically } from '@/features/tasks/logic/parseTaskInput'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@/types/entities'
import type { TaskCategory, TaskPriority } from '@/types/entities'
import { logWarn } from '@/utils'

/**
 * LLM task capture for paid users.
 *
 * Always falls back to the heuristic parser rather than failing: losing the
 * extracted metadata is far better than losing the task the user just spoke
 * or typed.
 */

const isCategory = (value: unknown): value is TaskCategory =>
  typeof value === 'string' && (TASK_CATEGORIES as readonly string[]).includes(value)

const isPriority = (value: unknown): value is TaskPriority =>
  typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value)

export const parseTaskWithAI = async (input: string, nowMs: number): Promise<ParsedTask> => {
  const fallback = parseTaskHeuristically(input, nowMs)

  try {
    const response: unknown = await base44.integrations.Core.InvokeLLM({
      prompt:
        `Extract structured task fields from this input. Today is ${new Date(nowMs).toISOString()}.\n\n` +
        `Input: "${input}"\n\n` +
        `Return JSON only. "title" must be the task with date and duration words removed.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          due_date: { type: ['string', 'null'] },
          estimated_minutes: { type: ['number', 'null'] },
          category: { type: ['string', 'null'], enum: [...TASK_CATEGORIES, null] },
          priority: { type: ['string', 'null'], enum: [...TASK_PRIORITIES, null] },
        },
        required: ['title'],
      },
    })

    if (typeof response !== 'object' || response === null) return fallback
    const parsed = response as Record<string, unknown>

    return {
      title: typeof parsed.title === 'string' && parsed.title ? parsed.title : fallback.title,
      due_date: typeof parsed.due_date === 'string' ? parsed.due_date : fallback.due_date,
      estimated_minutes:
        typeof parsed.estimated_minutes === 'number'
          ? parsed.estimated_minutes
          : fallback.estimated_minutes,
      category: isCategory(parsed.category) ? parsed.category : fallback.category,
      priority: isPriority(parsed.priority) ? parsed.priority : fallback.priority,
    }
  } catch (error) {
    logWarn('[addTask] AI parse failed, using heuristics', error)
    return fallback
  }
}
