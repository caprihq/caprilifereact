import type { DehydratedState } from '@tanstack/react-query'

/**
 * Serialising the query cache to disk, and reading it back safely.
 *
 * Pure — no storage, no clock, no QueryClient. Everything it needs is an
 * argument, so every rejection rule below is a unit test rather than something
 * that has to be reproduced on a plane (§2.3).
 *
 * WHY THE CACHE IS PERSISTED AT ALL
 *   React Query's cache is memory only, so every cold start began with no tasks
 *   and a network request. With no signal that request fails and the user is
 *   shown an error, even though their task list has not changed since they last
 *   looked at it. Writing the cache down means a launch renders the last known
 *   list immediately and refreshes behind it.
 */

/**
 * Bumped whenever a cached shape changes.
 *
 * A snapshot written by an older build can hold rows whose fields no longer
 * match what the code expects, and hydrating those puts malformed records into
 * the cache where nothing will ever correct them — only a reinstall clears it.
 * A mismatch is therefore discarded rather than migrated.
 */
export const CACHE_SCHEMA_VERSION = 1

/**
 * How long a snapshot may be trusted.
 *
 * Long enough to cover a night and a commute — the gap this exists to fill —
 * and short enough that a phone left in a drawer for a week does not open onto
 * a plausible-looking list of last Tuesday's priorities.
 */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Query key roots worth keeping. Anything else is dropped from the snapshot. */
const PERSISTED_ROOTS: readonly string[] = ['tasks', 'commitments', 'focusTimes', 'user']

export type CacheEnvelope = {
  readonly version: number
  readonly savedAtMs: number
  readonly state: DehydratedState
}

/**
 * Should this query be written to disk?
 *
 * Calendar events are deliberately absent. They belong to Google rather than to
 * CAPRI, and a stale meeting list is worse than no meeting list: a user reading
 * yesterday's schedule as today's will miss something. Tasks are CAPRI's own and
 * change only when the user changes them, so a stale copy is merely old.
 */
export const isPersistable = (queryKey: readonly unknown[]): boolean => {
  const [root] = queryKey
  return typeof root === 'string' && PERSISTED_ROOTS.includes(root)
}

/** Wrap a dehydrated cache for storage. Never throws; the caller may. */
export const encodeSnapshot = (state: DehydratedState, savedAtMs: number): string =>
  JSON.stringify({ version: CACHE_SCHEMA_VERSION, savedAtMs, state } satisfies CacheEnvelope)

const isEnvelope = (value: unknown): value is CacheEnvelope => {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.version === 'number' &&
    typeof record.savedAtMs === 'number' &&
    typeof record.state === 'object' &&
    record.state !== null
  )
}

/**
 * Read a snapshot back, or `null` if it must not be used.
 *
 * Returns null rather than throwing for every rejection — unreadable JSON, the
 * wrong schema, too old, written in the future. A stored cache is a convenience;
 * nothing about the app should stop working because one could not be read, and a
 * throw on the launch path would be exactly that.
 *
 * A snapshot stamped in the future is discarded because the device clock moved
 * backwards, which makes the age check meaningless — a wrong clock could
 * otherwise pin a snapshot as permanently fresh.
 */
export const decodeSnapshot = (
  raw: string | undefined,
  nowMs: number,
): DehydratedState | null => {
  if (!raw) return null

  const parsed: unknown = safeParse(raw)
  if (!isEnvelope(parsed)) return null
  if (parsed.version !== CACHE_SCHEMA_VERSION) return null

  const age = nowMs - parsed.savedAtMs
  if (age < 0 || age > CACHE_MAX_AGE_MS) return null

  return parsed.state
}

const safeParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    // Corrupt or truncated — a half-written file after a kill mid-save. There is
    // nothing to report and nothing to do but fetch fresh.
    return null
  }
}
