import { invokeAIWithData } from './invokeAI'
import { describeError, diag, diagFailure } from '@/utils'
import type { Task } from '@/types/entities'
import { RECOMMENDATION_COUNT } from '../logic/recommendationCache'
import type { Recommendation } from '../logic/recommendationCache'
import { logAIUsage } from './aiUsageLog'

/**
 * "What should I do right now?" — the model's answer, for both Start Here and Up Next.
 *
 * The first recommendation is the Start Here hero and the rest fill Up Next. The web
 * client asks the same question twice — once in `WhatsNextCard` and again in
 * `NextTaskSheet` — and pays for two model calls to get one answer. Asking once is
 * the same product with half the spend, and it is why Start Here can explain itself
 * in CAPRI's words rather than a canned line from the local engine.
 *
 * The prompt lives on the server (`invokeAI/prompts.ts` in the backend), because
 * recommendations are free and a free feature must not carry a prompt the client
 * wrote: it could ask for paid work under a free label. The app sends the task list
 * and the user's context; the server writes the question with CAPRI's scoring rules
 * and owns the answer's shape. It returns three picks, and `useUpNext` tops the queue
 * up from the local ranking.
 */

const summarise = (tasks: readonly Task[]): string =>
  tasks
    .slice(0, 40)
    .map((task) =>
      [
        task.id,
        task.title,
        task.priority ?? 'medium',
        task.estimated_minutes ?? '?',
        task.due_date?.slice(0, 10) ?? 'no date',
        task.category ?? 'personal',
      ].join(' | '),
    )
    .join('\n')

export type RecommendRequest = {
  readonly tasks: readonly Task[]
  readonly userEmail: string | null
  /**
   * The user's preferences and today's load; see `useUserContext`. Without it the
   * model ranks a list in a vacuum and will put a two-hour deep-work block first on a
   * day with six hours already booked. Optional, so a slow or missing profile costs
   * personalisation rather than the whole recommendation.
   */
  readonly contextSummary: string | null
}

export const recommendTasks = async (
  request: RecommendRequest,
): Promise<readonly Recommendation[] | null> => {
  const { tasks, userEmail, contextSummary } = request

  if (tasks.length === 0) return []

  const startedAt = Date.now()
  diag('ai:recommend:start', { candidates: tasks.length })

  try {
    const response: unknown = await invokeAIWithData('recommendations', {
      task_summary: summarise(tasks),
      context_summary: contextSummary ?? '',
    })

    const parsed = (response as { recommendations?: unknown } | null)?.recommendations
    if (!Array.isArray(parsed)) {
      void logAIUsage({
        userId: userEmail ?? 'unknown',
        eventType: 'ai_up_next_recommendation',
        success: false,
        timestampMs: Date.now(),
        latencyMs: Date.now() - startedAt,
        errorMessage: 'malformed response',
      })
      return null
    }

    // Ids are matched against the real list by the caller; anything invented by the
    // model simply drops out there rather than rendering an empty row.
    const valid = parsed.filter(
      (entry): entry is Recommendation =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Recommendation).task_id === 'string' &&
        typeof (entry as Recommendation).reason === 'string',
    )

    void logAIUsage({
      userId: userEmail ?? 'unknown',
      eventType: 'ai_up_next_recommendation',
      success: true,
      timestampMs: Date.now(),
      latencyMs: Date.now() - startedAt,
    })
    diag('ai:recommend:ok', { returned: valid.length })

    return valid.slice(0, RECOMMENDATION_COUNT)
  } catch (error) {
    void logAIUsage({
      userId: userEmail ?? 'unknown',
      eventType: 'ai_up_next_recommendation',
      success: false,
      timestampMs: Date.now(),
      latencyMs: Date.now() - startedAt,
      errorMessage: describeError(error).message,
    })
    diagFailure('ai:recommend', error)
    return null
  }
}
