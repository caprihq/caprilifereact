import type { Task } from '@/types/entities'

/**
 * Which open tasks exist — deliberately not what order they are in.
 *
 * The widget had two authors that ranked differently. The app publishes exactly
 * what Home shows, folding in CAPRI's recommendation, a refresh, and anything saved
 * for later. The reminder sweep also pushed a snapshot every few minutes, ranked by
 * priority and score alone, and whenever its order differed from the app's it
 * overwrote the widget. So the widget and Home disagreed even with the app open.
 *
 * The server cannot reproduce Home's order, so it must not be the one deciding it.
 * What it *can* see that the app cannot is a change to the set itself — a task added
 * in the browser, a recurrence rolling over — and that is the only thing it should
 * push for. Both sides fingerprint the set the same way; the app records what it has
 * published, and the sweep stays quiet unless the set has moved on from that.
 *
 * Mirrored in base44/functions/sendPushNotification/entry.ts (`openTaskFingerprint`).
 * Change both or neither — `widgetFingerprint.test.ts` pins the exact output.
 *
 * Due date and duration are left out on purpose: the app writes them optimistically
 * in its own format and the server may store them normalised, and a mismatch there
 * would read as a change on every sweep.
 */

const OPEN_STATUSES: ReadonlySet<string> = new Set(['pending', 'in_progress'])

const lineFor = (task: Task): string =>
  [task.id, task.status ?? '', task.priority ?? '', task.title].join('|')

/** FNV-1a, 32-bit. Small, deterministic, and trivial to mirror in the backend. */
const fnv1a = (input: string): string => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export const openTaskFingerprint = (tasks: readonly Task[]): string =>
  fnv1a(
    tasks
      .filter((task) => OPEN_STATUSES.has(task.status ?? '') && !task.is_scheduled_event)
      .map(lineFor)
      .sort()
      .join('\n'),
  )
