import { invokeAI } from './invokeAI'
import { describeError, diag, diagFailure } from '@/utils'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@/types/entities'
import type { TaskCategory, TaskPriority } from '@/types/entities'
import { bandForScore, clampScore } from '../logic/priorityBand'
import { logAIUsage } from './aiUsageLog'

/**
 * Judge a brand-new task as it is saved.
 *
 * This is the web client's prioritisation-on-save, which had no counterpart here: a
 * task created in this app was written as a flat `medium` with no score and no
 * reason, so it sorted below everything in a list ordered on `priority_score` and
 * showed no "why now" line. The two visible consequences of that were a ranking that
 * ignored new work and cards that looked emptier than the web's.
 *
 * The prompt is the web's, including the user-context block — the point of sending it
 * is calibration, so that "review the deck" on a free afternoon and the same task on
 * a six-hour day are not judged identically.
 *
 * `suggested_category` and `suggested_minutes` are advisory: they fill a field the
 * user left blank and never overwrite one they set.
 */

export type PrioritiseResult = {
  readonly priority: TaskPriority
  readonly priority_score: number
  readonly priority_reason: string
  readonly suggested_category: TaskCategory | undefined
  readonly suggested_minutes: number | undefined
}

export type PrioritiseRequest = {
  readonly title: string
  readonly description: string | undefined
  readonly category: TaskCategory | undefined
  readonly dueDate: string | undefined
  readonly estimatedMinutes: number | undefined
  readonly userEmail: string | null
  readonly nowMs: number
  /** The user's preferences and today's load; see `useUserContext`. */
  readonly contextSummary: string | null
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    priority: { type: 'string', enum: [...TASK_PRIORITIES] },
    priority_score: { type: 'number' },
    priority_reason: { type: 'string' },
    suggested_category: { type: 'string', enum: [...TASK_CATEGORIES] },
    suggested_minutes: { type: 'number' },
  },
  required: ['priority', 'priority_score', 'priority_reason'],
} as const

const day = (iso: string | undefined): string => iso?.slice(0, 10) ?? 'not set'

const prompt = (request: PrioritiseRequest): string =>
  `You are a personalized productivity assistant. Analyze this task and determine its priority.\n\n` +
  (request.contextSummary ? `${request.contextSummary}\n\n` : '') +
  `New Task: "${request.title}"\n` +
  `Description: "${request.description ?? ''}"\n` +
  `Category: "${request.category ?? 'personal'}"\n` +
  `Due date: "${day(request.dueDate)}"\n` +
  `Estimated time: "${request.estimatedMinutes ? String(request.estimatedMinutes) : 'not specified'} minutes"\n` +
  `Current date: "${new Date(request.nowMs).toISOString().slice(0, 10)}"\n\n` +
  `Use the user's profile to calibrate priority. Consider urgency, importance, and ` +
  `workload. Be decisive. priority_score is 0-100 and MUST match the label: ` +
  `critical=75-100, high=50-74, medium=25-49, low=0-24. ` +
  `Write priority_reason directly to the user, using "you" and "your", in one sentence.`

const asCategory = (value: unknown): TaskCategory | undefined =>
  typeof value === 'string' && (TASK_CATEGORIES as readonly string[]).includes(value)
    ? (value as TaskCategory)
    : undefined

const asMinutes = (value: unknown): number | undefined =>
  typeof value === 'number' && value > 0 ? Math.round(value) : undefined

/** `null` means "use the local heuristic": a save must never fail on the model. */
export const prioritiseTask = async (
  request: PrioritiseRequest,
): Promise<PrioritiseResult | null> => {
  const startedAt = Date.now()
  diag('ai:prioritise:start', { title: request.title })

  const log = (success: boolean, errorMessage?: string) => {
    void logAIUsage({
      userId: request.userEmail ?? 'unknown',
      eventType: 'ai_task_prioritise',
      success,
      timestampMs: Date.now(),
      ...(request.category ? { taskCategory: request.category } : {}),
      latencyMs: Date.now() - startedAt,
      ...(errorMessage ? { errorMessage } : {}),
    })
  }

  try {
    const response: unknown = await invokeAI('prioritise', prompt(request), RESPONSE_SCHEMA)

    const parsed = (response ?? {}) as Record<string, unknown>
    const score = typeof parsed.priority_score === 'number' ? parsed.priority_score : null
    const reason = typeof parsed.priority_reason === 'string' ? parsed.priority_reason.trim() : ''

    if (score === null || !reason) {
      log(false, 'incomplete response')
      return null
    }

    log(true)
    diag('ai:prioritise:ok', { score })

    return {
      // Derived from the score, not read from the label: a model that answers "low"
      // with 90 would otherwise sit at the top of a list sorted by band then score.
      priority: bandForScore(score),
      priority_score: clampScore(score),
      priority_reason: reason,
      suggested_category: asCategory(parsed.suggested_category),
      suggested_minutes: asMinutes(parsed.suggested_minutes),
    }
  } catch (error) {
    log(false, describeError(error).message)
    diagFailure('ai:prioritise', error)
    return null
  }
}
