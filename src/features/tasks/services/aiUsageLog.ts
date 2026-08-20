import { AIUsageLogEntity } from '@/services/api'
import type { AIEventType } from '@/types/entities'
import { logWarn } from '@/utils'

/**
 * AI spend accounting.
 *
 * The web client wrote these inline in SubtasksSection, duplicating the payload
 * across the success and failure paths. Centralised here so every AI feature
 * logs the same shape — the entity exists precisely so free-tier AI usage can be
 * measured server-side, and until something writes to it that is impossible.
 *
 * Logging must never take a feature down: a failed log is warned about and
 * swallowed, never propagated to the caller (§5.1).
 */

export type AIUsageEntry = {
  readonly userId: string
  readonly eventType: AIEventType
  readonly success: boolean
  readonly timestampMs: number
  readonly taskId?: string
  readonly taskCategory?: string
  readonly latencyMs?: number
  readonly errorMessage?: string
}

export const logAIUsage = async (entry: AIUsageEntry): Promise<void> => {
  try {
    await AIUsageLogEntity().create({
      user_id: entry.userId,
      event_type: entry.eventType,
      success: entry.success,
      timestamp: new Date(entry.timestampMs).toISOString(),
      ...(entry.taskId === undefined ? {} : { task_id: entry.taskId }),
      ...(entry.taskCategory === undefined ? {} : { task_category: entry.taskCategory }),
      ...(entry.latencyMs === undefined ? {} : { latency_ms: entry.latencyMs }),
      ...(entry.errorMessage === undefined ? {} : { error_message: entry.errorMessage }),
    })
  } catch (error) {
    logWarn('[aiUsage] could not record usage', { eventType: entry.eventType, error })
  }
}
