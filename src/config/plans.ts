import type { Plan } from '@/types/entities'

/**
 * Plan tiers and feature gating — native port of web/src/components/usePlan.jsx.
 *
 * Kept pure and separate from React so the rules can be tested directly and
 * reused by non-component code.
 */

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'CAPRI Free',
  executive: 'CAPRI Executive Assistant',
  chief_of_staff: 'CAPRI Chief of Staff',
  // Legacy alias — early subscribers still carry this. Treated as executive.
  pro: 'CAPRI Executive Assistant',
}

const PLAN_TIER: Record<Plan, number> = {
  free: 0,
  executive: 1,
  pro: 1,
  chief_of_staff: 2,
}

export const FEATURES = [
  'unlimited_tasks',
  'calendar_sync',
  'recurring_tasks',
  'subtasks',
  'auto_schedule',
  'integrations',
  'analytics',
] as const
export type Feature = (typeof FEATURES)[number]

/**
 * Minimum plan per feature.
 *
 * ⚠️ Every paid feature MUST appear here. `hasAccess` returns true for any
 * feature missing from this map, and on the web that omission silently handed
 * every free user unlimited AI. `whats_next` is deliberately absent because
 * free users are meant to have it.
 */
const FEATURE_REQUIREMENT: Record<Feature, Plan> = {
  unlimited_tasks: 'executive',
  calendar_sync: 'executive',
  recurring_tasks: 'executive',
  subtasks: 'executive',
  auto_schedule: 'executive',
  integrations: 'executive',
  analytics: 'executive',
}

/** Free-tier caps, matching the web client. */
export const FREE_LIMITS = {
  /** Voice-captured tasks per day. Typing stays unlimited. */
  voicePerDay: 1,
  /** "Up Next" AI refreshes per day. */
  upNextRefreshesPerDay: 3,
  /** Total tasks before an upgrade is required. */
  totalTasks: 50,
} as const

export const tierOf = (plan: Plan | undefined): number => PLAN_TIER[plan ?? 'free']

export const isPaidPlan = (plan: Plan | undefined): boolean => tierOf(plan) > 0

export const hasAccess = (plan: Plan | undefined, feature: Feature): boolean =>
  tierOf(plan) >= tierOf(FEATURE_REQUIREMENT[feature])

export const labelFor = (plan: Plan | undefined): string => PLAN_LABELS[plan ?? 'free']
