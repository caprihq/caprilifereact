import { isLocalToday } from '@/utils/localDate'
import type { Task } from '@/types/entities'

/**
 * "You've cleared everything that mattered today."
 *
 * The web client's `MotivationalBanner` fires on one condition, and it is a narrow
 * one on purpose: **every** critical and high task is done, and at least one of them
 * was finished today. Both halves matter — without the first it congratulates
 * someone mid-list, and without the second it fires every morning for a user who
 * simply has no urgent work.
 *
 * Habits are excluded: the web version also watches a habit streak, and this app has
 * no habits feature to watch.
 *
 * Pure, and the clock is an argument, so the boundary can be tested at a fixed
 * instant rather than at whatever time the suite happens to run (§2.3).
 */

const isTopPriority = (task: Task): boolean =>
  task.priority === 'critical' || task.priority === 'high'

export const topPrioritiesCleared = (
  tasks: readonly Task[],
  when: { readonly nowMs: number; readonly timeZone: string },
): boolean => {
  const top = tasks.filter(isTopPriority)

  const outstanding = top.filter((task) => task.status !== 'completed' && task.status !== 'canceled')
  if (outstanding.length > 0) return false

  return top.some(
    (task) =>
      task.status === 'completed' &&
      isLocalToday(task.completed_date, when.nowMs, when.timeZone),
  )
}
