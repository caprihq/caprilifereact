/**
 * Clashes the user said are fine ("keep both"), as stored on the device.
 *
 * Keyed by both items and both start times (see `overlapKey`), so moving either one
 * makes it a new clash that warns again. Capped, oldest first out: a key for a clash
 * from last month will never match anything again.
 */

const CAP = 200

export const parseDismissed = (raw: string | undefined): ReadonlySet<string> => {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [])
  } catch {
    // A corrupt entry only means old warnings come back once; nothing to recover.
    return new Set()
  }
}

export const withDismissed = (current: ReadonlySet<string>, key: string): readonly string[] =>
  [...[...current].filter((k) => k !== key), key].slice(-CAP)
