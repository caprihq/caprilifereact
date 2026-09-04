import type { TaskPriority } from '@/types/entities'

/**
 * The band a priority score belongs to: critical 75–100, high 50–74, medium 25–49,
 * low 0–24.
 *
 * The AI reprioritise prompt states this contract, and this function then *enforces*
 * it rather than trusting the label that comes back. A model that answers
 * `priority: "low"` with a score of 90 would put a low task at the top of a list
 * sorted by band and then score, which reads as a broken ranking rather than a
 * debatable judgement.
 *
 * Pure and here rather than in the service so it can be tested without loading the
 * Base44 SDK (§3.5).
 */
export const bandForScore = (score: number): TaskPriority =>
  score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'

/** Scores are written back clamped: the model occasionally returns 120 or -5. */
export const clampScore = (score: number): number => Math.round(Math.min(100, Math.max(0, score)))
