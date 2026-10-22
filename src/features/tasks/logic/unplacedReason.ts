/**
 * Why a task did not make it into the plan, in words a person can act on.
 *
 * WHY THIS MATTERS MORE THAN THE LIST ITSELF
 *   "Couldn't schedule 8 tasks" tells nobody anything. Each of these reasons has a
 *   different answer: shorten the task, move the deadline, or accept that the week
 *   is full. Saying which one it is turns a dead end into a decision.
 *
 *   The alternative — what the app did until now — is to show four suggestions and
 *   say nothing about the rest. A user with twelve tasks does not conclude "the week
 *   is full"; they conclude the feature is broken, or worse, that the other eight
 *   were scheduled and they simply cannot see them.
 *
 * The backend sends codes rather than sentences precisely so the wording lives here,
 * where it can be changed without a deploy.
 */

export type UnplacedReason =
  | 'no_block_long_enough'
  | 'no_time_before_due_date'
  | 'week_full'
  | 'ai_not_scheduled'

export type Unplaced = {
  readonly task_id: string
  readonly reason?: string
  /**
   * CAPRI's own sentence, when its AI chose to leave the task out ("your week is
   * already full; this can wait"). Generated text, shown as-is but never required.
   */
  readonly detail?: string
}

const WORDS: Readonly<Record<UnplacedReason, string>> = {
  no_block_long_enough: 'No free block long enough',
  no_time_before_due_date: 'No free time before it is due',
  week_full: 'Your week is full',
  ai_not_scheduled: 'Left for later this week',
}

/**
 * Falls back rather than showing a code.
 *
 * A reason this app has not been taught yet — a newer backend, a typo — must not
 * reach the screen as `no_block_long_enough`. "Could not fit this week" is true of
 * every case, so it is safe to say when the specific answer is unavailable.
 */
export const unplacedReason = (reason: string | undefined): string => {
  // Checked with `in` rather than cast-and-coalesce: the cast alone tells TypeScript
  // the key is always valid, which is exactly the thing that is not true here.
  if (reason && reason in WORDS) return WORDS[reason as UnplacedReason]

  return 'Could not fit this week'
}

/**
 * The line under a task's name: CAPRI's specific reason when it gave one, otherwise
 * the wording for its code.
 */
export const unplacedLine = (entry: Unplaced): string => {
  const detail = entry.detail?.trim()
  return detail ? detail : unplacedReason(entry.reason)
}

/**
 * "Needs attention (3)" — the heading, so the count is never written by hand.
 *
 * Named like the planner's section of the same name: these are tasks that need a
 * decision from the user (shorten, move the deadline, or let it wait), not errors.
 */
export const unplacedHeading = (count: number): string => `Needs attention (${String(count)})`
