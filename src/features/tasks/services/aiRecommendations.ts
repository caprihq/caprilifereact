import { invokeAI } from './invokeAI'
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
 * `NextTaskSheet` — with the same prompt and the same rules, and pays for two model
 * calls to get one answer. Asking once for four is the same product with half the
 * spend, and it is why Start Here can now explain itself in CAPRI's words rather than
 * a canned line from the local engine.
 *
 * The prompt is the web client's `buildScoringPrompt`, kept word for word because
 * its two hard rules are what stop the model recommending pleasant work over urgent
 * work: nothing without a near due date may rank first while something is due within
 * two days, and a closer due date beats a more important distant one. Softening
 * either produces a list that feels reasonable and is wrong.
 *
 * Numbers are deliberately not exposed in the reason — the card shows the sentence,
 * and "score 82" means nothing to a user.
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


/**
 * The web client's `buildScoringPrompt`, word for word.
 *
 * Its two hard rules are what stop the model recommending pleasant work over urgent
 * work: nothing without a near due date may rank first while something is due within
 * two days, and a closer due date beats a more important distant one. Softening
 * either produces a list that feels reasonable and is wrong.
 *
 * `contextSummary` is the user's preferences and today's load, from
 * `useUserContext`. It is optional so a slow or missing profile costs personalisation
 * rather than the whole recommendation.
 */
const scoringPrompt = (
  tasks: readonly Task[],
  nowMs: number,
  contextSummary: string | null,
): string =>
  `You are CAPRI, a personalized productivity coach. Recommend the top ${String(RECOMMENDATION_COUNT)} tasks to work on RIGHT NOW.\n\n` +
  // Who the user is and how full their day already is. The web client opens every
  // scoring call with this; without it the model ranks a list in a vacuum and will
  // put a two-hour deep-work block first on a day with six hours already booked.
  (contextSummary ? `${contextSummary}\n\n` : '') +
  `Scoring rules you MUST follow:\n` +
  `- Score = (Urgency × 3) + (Importance × 2) + Effort\n` +
  `- Urgency: overdue=5, due today=4, due 1-2 days=3, due 3-5 days=2, no date or far=1\n` +
  `- Importance: high/critical=3, medium=2, low=1\n` +
  `- Effort: <30min=3, 30-60min=2, >60min=1\n` +
  `- CRITICAL RULE: If ANY task has urgency >= 3 (due within 2 days or overdue), ` +
  `tasks with no due date or far future due dates CANNOT be the #1 recommendation.\n` +
  `- Closer due dates always win over distant due dates, even if the distant task ` +
  `is marked high importance.\n\n` +
  `Today: ${new Date(nowMs).toISOString().slice(0, 10)}\n\n` +
  `Pending Tasks (ID | title | priority | estimated_minutes | due_date | category):\n` +
  `${summarise(tasks)}\n\n` +
  `Return exactly ${String(RECOMMENDATION_COUNT)} task IDs ordered by CAPRI score (highest first). ` +
  `The first is what the user should start immediately. For each, write a ` +
  `short, direct reason (1 sentence) explaining why it ranks now — mention the due date ` +
  `or urgency if relevant. Do not expose scoring numbers.`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['task_id', 'reason'],
      },
    },
  },
  required: ['recommendations'],
} as const

export type RecommendRequest = {
  readonly tasks: readonly Task[]
  readonly userEmail: string | null
  readonly nowMs: number
  /** The user's preferences and today's load; see `useUserContext`. */
  readonly contextSummary: string | null
}

export const recommendTasks = async (
  request: RecommendRequest,
): Promise<readonly Recommendation[] | null> => {
  const { tasks, userEmail, nowMs, contextSummary } = request

  if (tasks.length === 0) return []

  const startedAt = Date.now()
  diag('ai:recommend:start', { candidates: tasks.length })

  try {
    const response: unknown = await invokeAI(
      'recommendations',
      scoringPrompt(tasks, nowMs, contextSummary),
      RESPONSE_SCHEMA,
    )

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
