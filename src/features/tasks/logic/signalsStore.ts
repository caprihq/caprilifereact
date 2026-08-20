import { mmkvPrefStore } from '@/services/storage'
import type { Task } from '@/types/entities'
import type { BehaviouralSignals } from './capriScoring'
import { logWarn } from '@/utils'

/**
 * The storage half of the scoring engine.
 *
 * `capriScoring` is pure and takes signals as data. This module is the one
 * place that reads and writes them, so storage is touched **once per render
 * pass** instead of once per comparison — the web version's fatal flaw.
 */

const INTERACTIONS_KEY = 'capri.signals.interactions'
const IGNORED_KEY = 'capri.signals.ignored'

const DAY_MS = 24 * 60 * 60 * 1000
const IGNORE_THRESHOLD = 3
/** A category counts as favoured above this share of completions. */
const FAVOURED_SHARE = 0.3

type CountMap = Record<string, number>

const readMap = (key: string): CountMap => {
  const raw = mmkvPrefStore.getString(key)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as CountMap) : {}
  } catch (error) {
    logWarn('[signals] discarding unreadable store', { key, error })
    return {}
  }
}

const writeMap = (key: string, value: CountMap): void => {
  mmkvPrefStore.setString(key, JSON.stringify(value))
}

/** Record that the user opened or acted on a task. */
export const recordInteraction = (taskId: string, nowMs: number): void => {
  const map = readMap(INTERACTIONS_KEY)
  map[taskId] = nowMs
  writeMap(INTERACTIONS_KEY, map)
}

/** Record that a recommended task was shown and skipped. */
export const recordIgnored = (taskId: string): void => {
  const map = readMap(IGNORED_KEY)
  map[taskId] = (map[taskId] ?? 0) + 1
  writeMap(IGNORED_KEY, map)
}

/** Categories the user completes disproportionately often. */
export const favouredCategories = (completed: readonly Task[]): ReadonlySet<string> => {
  const counts = new Map<string, number>()
  for (const task of completed) {
    if (task.category) counts.set(task.category, (counts.get(task.category) ?? 0) + 1)
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
  if (total === 0) return new Set()

  const favoured = new Set<string>()
  for (const [category, count] of counts) {
    if (count / total > FAVOURED_SHARE) favoured.add(category)
  }
  return favoured
}

/**
 * Read every signal in one pass. Call once, pass the result to `rankTasks`.
 */
export const loadSignals = (
  nowMs: number,
  completedTasks: readonly Task[] = [],
): BehaviouralSignals => {
  const interactions = readMap(INTERACTIONS_KEY)
  const ignored = readMap(IGNORED_KEY)

  const recentlyTouched = new Set(
    Object.entries(interactions)
      .filter(([, at]) => nowMs - at < DAY_MS)
      .map(([taskId]) => taskId),
  )

  const repeatedlyIgnored = new Set(
    Object.entries(ignored)
      .filter(([, count]) => count >= IGNORE_THRESHOLD)
      .map(([taskId]) => taskId),
  )

  return {
    recentlyTouched,
    repeatedlyIgnored,
    favouredCategories: favouredCategories(completedTasks),
  }
}

/** Drop entries older than a day so the store cannot grow without bound. */
export const pruneSignals = (nowMs: number): void => {
  const interactions = readMap(INTERACTIONS_KEY)
  const kept = Object.fromEntries(
    Object.entries(interactions).filter(([, at]) => nowMs - at < DAY_MS),
  )
  writeMap(INTERACTIONS_KEY, kept)
}

/** Sign-out: the next user must not inherit these. */
export const clearSignals = (): void => {
  mmkvPrefStore.remove(INTERACTIONS_KEY)
  mmkvPrefStore.remove(IGNORED_KEY)
}
