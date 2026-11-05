import { invokeAI } from './invokeAI'
import { parseTaskHeuristically } from '@/features/tasks/logic/parseTaskInput'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import {
  DUE_DATE_INSTRUCTION,
  dueDateFromModel,
  promptClock,
} from '@/features/tasks/logic/aiDueDate'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@/types/entities'
import type { TaskCategory, TaskPriority } from '@/types/entities'
import { logWarn } from '@/utils'
import { logAIUsage } from './aiUsageLog'

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

/**
 * The model's answer over the heuristic one, field by field.
 *
 * Merged per field rather than wholesale: a response that gets the title right and
 * the date wrong should keep the title, and an omitted field should keep whatever
 * the heuristic worked out rather than becoming undefined.
 */
const merge = (
  parsed: Record<string, unknown>,
  fallback: ParsedTask,
  timeZone: string,
): ParsedTask => ({
  title: typeof parsed.title === 'string' && parsed.title ? parsed.title : fallback.title,
  // Only when the model actually returned prose: an empty string would overwrite a
  // description the user already had.
  description:
    typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description
      : fallback.description,
  // Read in the user's zone: a bare "2026-11-05" is that day where they are.
  due_date: dueDateFromModel(parsed.due_date, timeZone) ?? fallback.due_date,
  estimated_minutes:
    typeof parsed.estimated_minutes === 'number'
      ? parsed.estimated_minutes
      : fallback.estimated_minutes,
  category: isCategory(parsed.category) ? parsed.category : fallback.category,
  priority: isPriority(parsed.priority) ? parsed.priority : fallback.priority,
})

/**
 * Whether the model actually read the input, or the heuristic stood in for it.
 *
 * The caller needs to know: silently handing back a weaker parse leaves the user
 * looking at a half-understood task with no idea why, and their next move — retype
 * it, or open Edit details — depends entirely on which happened.
 */
export type ParseOutcome = {
  readonly draft: ParsedTask
  readonly usedAI: boolean
}

/** Dates are local to the user, both ways — see `aiDueDate`. */
const taskParsePrompt = (input: string, nowMs: number, timeZone: string): string =>
  `Extract structured task fields from this input. Today is ${promptClock(nowMs, timeZone)}.\n\n` +
  `Input: "${input}"\n\n` +
  `Return JSON only. "title" must be the task with date and duration words removed. ` +
  `Put any remaining notes or detail in "description", or null if there are none. ` +
  DUE_DATE_INSTRUCTION

export type ParseContext = {
  readonly nowMs: number
  /** The user's zone: what "today" and "tomorrow" mean, and how dates are read back. */
  readonly timeZone: string
  readonly userEmail: string | null
}

export const parseTaskWithAI = async (
  input: string,
  { nowMs, timeZone, userEmail }: ParseContext,
): Promise<ParseOutcome> => {
  const fallback = parseTaskHeuristically(input, nowMs)
  const startedAt = Date.now()

  /**
   * Logged like every other AI call. This was the one service that never did, so
   * `AIUsageLog` was missing the most frequent call in the app — one per task
   * created on a paid plan — and any spend measured from it read low.
   */
  const logged = (success: boolean, errorMessage?: string) =>
    logAIUsage({
      userId: userEmail ?? 'unknown',
      eventType: 'ai_task_parse',
      success,
      timestampMs: nowMs,
      latencyMs: Date.now() - startedAt,
      ...(errorMessage === undefined ? {} : { errorMessage }),
    })

  try {
    const response: unknown = await invokeAI(
      'task_parse',
      taskParsePrompt(input, nowMs, timeZone),
      {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          due_date: { type: ['string', 'null'] },
          estimated_minutes: { type: ['number', 'null'] },
          category: { type: ['string', 'null'], enum: [...TASK_CATEGORIES, null] },
          priority: { type: ['string', 'null'], enum: [...TASK_PRIORITIES, null] },
        },
        required: ['title'],
      },
    )

    if (typeof response !== 'object' || response === null) {
      void logged(false, 'non-object response')
      return { draft: fallback, usedAI: false }
    }
    const parsed = response as Record<string, unknown>

    void logged(true)
    return { draft: merge(parsed, fallback, timeZone), usedAI: true }
  } catch (error) {
    void logged(false, error instanceof Error ? error.message : 'Unknown error')
    logWarn('[addTask] AI parse failed, using heuristics', error)
    return { draft: fallback, usedAI: false }
  }
}
