import type { Task } from '@/types/entities'

/**
 * The confirmation shown before a task is marked done.
 *
 * Completion was a single tap on a small circle whose only undo was a toast that
 * disappears in seconds, so a mis-tap quietly finished someone's work. Marking
 * something done is also the one action here that claims a thing happened in the
 * real world, which is worth a question — while deferring and cancelling stay
 * immediate, because both are reversible in place.
 *
 * The wording lives here, in one place, so the four screens that can complete a task
 * cannot drift into asking four different questions.
 */

/** Names the task: "are you sure?" over a list of six is not an answerable question. */
export const completionTitle = (task: Task | null): string =>
  task ? `Mark "${task.title}" done?` : ''

/** Says where the task goes, so the answer is informed rather than brave. */
export const COMPLETION_MESSAGE = 'It moves out of your open work. You can find it under Done.'

/** Names the outcome rather than saying "OK". */
export const COMPLETION_CONFIRM_LABEL = 'Mark done'

export const COMPLETION_ICON = 'checkmark-circle-outline'
