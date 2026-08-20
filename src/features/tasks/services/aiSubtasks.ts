import { base44 } from '@/services/api'
import { subtasksFromTitles } from '@/features/tasks/logic/subtasks'
import type { Subtask, Task } from '@/types/entities'
import { logAIUsage } from './aiUsageLog'
import { logWarn } from '@/utils'

/**
 * "Break this into steps" — the LLM subtask breakdown.
 *
 * Ported from the generate mutation inside web/src/components/tasks/
 * SubtasksSection.jsx. The prompt is carried over verbatim so results match
 * what users already get.
 *
 * Returns a discriminated result rather than throwing, so the caller renders a
 * message instead of unwinding (§2.6). Usage is logged on both paths.
 */

export type SubtaskGeneration =
  | { readonly kind: 'generated'; readonly subtasks: readonly Subtask[] }
  | { readonly kind: 'error'; readonly message: string }

const PROMPT_TAIL =
  'Return only the subtask titles — short, action-oriented, starting with a verb ' +
  '(e.g. "Draft outline", "Book appointment"). No fluff.'

const buildPrompt = (task: Task): string =>
  `Break down this task into 3–6 concrete, actionable subtasks a person can actually check off one by one.
Task: "${task.title}"
Description: "${task.description ?? 'none'}"
Category: ${task.category ?? 'personal'}

${PROMPT_TAIL}`

/** Titles the model returned, ignoring blanks and non-strings. */
const readTitles = (response: unknown): readonly string[] => {
  if (typeof response !== 'object' || response === null) return []
  const { subtasks } = response as { subtasks?: unknown }
  if (!Array.isArray(subtasks)) return []
  return subtasks
    .filter((entry): entry is string => typeof entry === 'string')
    .map((title) => title.trim())
    .filter((title) => title.length > 0)
}

export const generateSubtasks = async (
  task: Task,
  userEmail: string | null,
  nowMs: number,
): Promise<SubtaskGeneration> => {
  // Latency is measured rather than injected: this module is an I/O edge, and a
  // duration cannot be derived from the single render-stable clock.
  const startedAt = Date.now()
  const userId = userEmail ?? 'unknown'

  const logged = (success: boolean, errorMessage?: string) =>
    logAIUsage({
      userId,
      eventType: 'ai_subtask_generation',
      success,
      timestampMs: nowMs,
      taskId: task.id,
      ...(task.category === undefined ? {} : { taskCategory: task.category }),
      latencyMs: Date.now() - startedAt,
      ...(errorMessage === undefined ? {} : { errorMessage }),
    })

  try {
    const response: unknown = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(task),
      response_json_schema: {
        type: 'object',
        properties: { subtasks: { type: 'array', items: { type: 'string' } } },
        required: ['subtasks'],
      },
    })

    const titles = readTitles(response)
    if (titles.length === 0) {
      void logged(false, 'model returned no usable titles')
      return { kind: 'error', message: "CAPRI couldn't break this one down. Try rewording the task." }
    }

    void logged(true)
    return { kind: 'generated', subtasks: subtasksFromTitles(titles, nowMs) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    void logged(false, message)
    logWarn('[aiSubtasks] generation failed', error)
    return { kind: 'error', message: "Couldn't generate steps. Please try again." }
  }
}
