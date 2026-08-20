/**
 * Types mirrored from base44/entities/*.jsonc.
 *
 * Kept in sync by hand — Base44 does not emit types. When an entity schema
 * changes at the repo root, change it here in the same commit.
 *
 * Every field except the `required` ones in the schema is optional, because
 * Base44 omits unset fields from responses rather than returning null.
 */

export const TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'saved_for_later',
  'canceled',
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_CATEGORIES = [
  'work',
  'personal',
  'health',
  'finance',
  'learning',
  'errands',
  'social',
] as const
export type TaskCategory = (typeof TASK_CATEGORIES)[number]

export const RECURRENCES = ['none', 'daily', 'weekly', 'monthly'] as const
export type Recurrence = (typeof RECURRENCES)[number]

export type Subtask = {
  readonly id: string
  readonly title: string
  readonly completed: boolean
}

/** base44/entities/Task.jsonc — `title` is the only required property. */
export type Task = {
  readonly id: string
  readonly title: string
  readonly created_by?: string
  readonly description?: string
  readonly priority?: TaskPriority
  readonly priority_score?: number
  readonly priority_reason?: string
  readonly category?: TaskCategory
  readonly due_date?: string
  readonly scheduled_start_time?: string
  readonly scheduled_end_time?: string
  readonly estimated_minutes?: number
  readonly status?: TaskStatus
  readonly completed_date?: string
  readonly recurrence?: Recurrence
  readonly recurrence_end_date?: string
  readonly subtasks?: readonly Subtask[]
  readonly is_scheduled_event?: boolean
  readonly calendar_event_id?: string
  readonly calendar_synced_due_date?: string
  readonly creation_source?: 'manual' | 'voice'
}

/**
 * A Google Calendar event as base44/functions/getUserCalendarEvents returns it.
 *
 * Not an entity — the backend flattens Google's payload before sending it:
 *
 *     start: event.start?.dateTime || event.start?.date
 *
 * So `start` and `end` are ISO **strings**, not Google's `{ dateTime, date }`
 * objects. The web client's TodayCommitmentsCard reads `e.start?.dateTime`
 * anyway, which is always undefined here, so every calendar event sorted as an
 * Invalid Date. That is the defect guidelines §2.1 cites.
 */
export type CalendarEvent = {
  readonly id: string
  readonly title: string
  readonly start: string
  readonly end: string
  readonly allDay: boolean
  /** The backend sends `event.location || null`, so null is expected. */
  readonly location?: string | null
}

/** base44/entities/Commitment.jsonc */
export type Commitment = {
  readonly id: string
  readonly title: string
  readonly start_time: string
  readonly end_time: string
  readonly created_by?: string
  readonly description?: string
  readonly origin_source?: 'manual' | 'google_calendar'
  readonly external_event_id?: string
}

export const AI_EVENT_TYPES = [
  'ai_subtask_generation',
  'ai_reprioritize',
  'ai_start_here_recommendation',
  'ai_up_next_recommendation',
] as const
export type AIEventType = (typeof AI_EVENT_TYPES)[number]

/**
 * base44/entities/AIUsageLog.jsonc — how AI spend is accounted for.
 *
 * `user_id`, `event_type`, `success` and `timestamp` are required by the schema.
 */
export type AIUsageLog = {
  readonly id: string
  readonly user_id: string
  readonly event_type: AIEventType
  readonly success: boolean
  readonly timestamp: string
  readonly task_id?: string
  readonly task_category?: string
  readonly latency_ms?: number
  readonly estimated_tokens_or_credits?: number
  readonly error_message?: string
}

export const PLANS = ['free', 'executive', 'chief_of_staff', 'pro'] as const
export type Plan = (typeof PLANS)[number]

/** base44/entities/User.jsonc, plus the identity fields Base44 owns. */
export type User = {
  readonly id: string
  readonly email: string
  readonly full_name?: string
  readonly role?: 'admin' | 'user'
  readonly plan?: Plan
  readonly display_name?: string
  readonly timezone?: string
  readonly work_hours_start?: string
  readonly work_hours_end?: string
  readonly preferred_task_duration?: 'quick' | 'mixed' | 'long'
  readonly energy_peak_hours?: readonly number[]
  readonly context_switch_tolerance?: 'low' | 'medium' | 'high'
  readonly priority_categories?: readonly string[]
  readonly notification_enabled?: boolean
  readonly notification_quiet_hours_start?: string
  readonly notification_quiet_hours_end?: string
  // Server-managed. Never write these from the client.
  readonly apns_device_token?: string
  readonly subscription_last_event_at?: number
  readonly subscription_product_id?: string
  readonly subscription_expires_at?: number
}
