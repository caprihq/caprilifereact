import { invokeAI } from './invokeAI'
import { describeError, diag, diagFailure } from '@/utils'
import { TASK_PRIORITIES } from '@/types/entities'
import type { Task, TaskPriority } from '@/types/entities'
import { bandForScore, clampScore } from '../logic/priorityBand'
import { logAIUsage } from './aiUsageLog'

/**
 * Ask CAPRI to re-judge a task's priority.
 *
 * Ported from the web client's `handleReprioritize`. The prompt keeps its two
 * non-obvious instructions, both of which are load-bearing:
 *
 * 1. **The score must match the label.** critical 75–100, high 50–74, medium 25–49,
 *    low 0–24. Without it the model happily returns `priority: "low"` with a score
 *    of 90, and the list — which sorts by band and then score — puts a low task at
 *    the top, reading as a broken ranking rather than a bad judgement.
 * 2. **The reason is addressed to the user** ("you/your"). It is shown verbatim on
 *    the card under 💡, so third-person text reads as a system log.
 *
 * A response that fails the band check is rejected rather than written: a wrong
 * priority is worse than no change, because it silently reorders the day.
 */

export type ReprioritiseResult =
  | {
      readonly kind: 'ok'
      readonly priority: TaskPriority
      readonly priority_score: number
      readonly priority_reason: string
    }
  | { readonly kind: 'error'; readonly message: string }

const isPriority = (value: unknown): value is TaskPriority =>
  typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value)

export const reprioritiseTask = async (
  task: Task,
  userEmail: string | null,
): Promise<ReprioritiseResult> => {
  const startedAt = Date.now()
  diag('ai:reprioritise:start', { taskId: task.id })

  const log = (success: boolean, errorMessage?: string) => {
    void logAIUsage({
      userId: userEmail ?? 'unknown',
      eventType: 'ai_reprioritize',
      success,
      timestampMs: Date.now(),
      taskId: task.id,
      ...(task.category ? { taskCategory: task.category } : {}),
      latencyMs: Date.now() - startedAt,
      ...(errorMessage ? { errorMessage } : {}),
    })
  }

  try {
    const response: unknown = await invokeAI('reprioritise', `Re-prioritize this task.\n` +
        `Title: "${task.title}"\n` +
        `Notes: "${task.description ?? ''}"\n` +
        `Category: "${task.category ?? 'personal'}"\n` +
        `Due: "${task.due_date ? task.due_date.slice(0, 10) : 'none'}"\n` +
        `Today: "${new Date(startedAt).toISOString().slice(0, 10)}"\n\n` +
        `Be decisive. priority_score is 0-100 and MUST match the label: ` +
        `critical=75-100, high=50-74, medium=25-49, low=0-24. ` +
        `Write priority_reason directly to the user, using "you" and "your", in one sentence.`, {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: [...TASK_PRIORITIES] },
          priority_score: { type: 'number' },
          priority_reason: { type: 'string' },
        },
        required: ['priority', 'priority_score', 'priority_reason'],
      })

    if (typeof response !== 'object' || response === null) {
      log(false, 'non-object response')
      return { kind: 'error', message: "CAPRI couldn't judge this one. Try again." }
    }

    const parsed = response as Record<string, unknown>
    const score = typeof parsed.priority_score === 'number' ? parsed.priority_score : null
    const reason = typeof parsed.priority_reason === 'string' ? parsed.priority_reason.trim() : ''

    if (score === null || !isPriority(parsed.priority) || !reason) {
      log(false, 'incomplete response')
      return { kind: 'error', message: "CAPRI couldn't judge this one. Try again." }
    }

    // The band is derived from the score rather than trusted from the label, so a
    // model that returns "low" with 90 cannot reorder the list.
    const priority = bandForScore(score)

    log(true)
    diag('ai:reprioritise:ok', { taskId: task.id, priority, score })

    return {
      kind: 'ok',
      priority,
      priority_score: clampScore(score),
      priority_reason: reason,
    }
  } catch (error) {
    log(false, describeError(error).message)
    diagFailure('ai:reprioritise', error)
    return { kind: 'error', message: "CAPRI couldn't reach the model. Try again." }
  }
}
