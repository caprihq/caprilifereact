import type { Commitment } from '@/types/entities'

/**
 * Turning the Add Commitment form into a record.
 *
 * Ported from web/src/components/commitments/AddCommitmentSheet.jsx, which built
 * its payload inline with `new Date(\`${date}T${startTime}\`)` and validated
 * nothing beyond a non-empty title. Two consequences it lived with:
 *
 *  - An end time before the start was saved happily, producing a commitment
 *    with a negative duration that then sorted oddly in the timeline.
 *  - `new Date("2026-03-10T09:00")` is parsed as *local* time, which is right
 *    for a time the user typed — but it was never stated, so it read like a bug.
 *    It is deliberate here, and tested.
 */

export type CommitmentDraft = {
  readonly title: string
  /** The calendar day. Only its date parts are read. */
  readonly day: Date
  /** Start time of day. Only its hours and minutes are read. */
  readonly start: Date
  readonly end: Date
}

export type DraftValidation =
  | { readonly kind: 'valid'; readonly payload: Partial<Commitment> }
  | { readonly kind: 'invalid'; readonly message: string }

/**
 * A local Date taking the calendar day from one value and the clock from
 * another, so changing the date never shifts the time.
 */
export const combineDayAndTime = (day: Date, time: Date): Date =>
  new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  )

export const validateCommitmentDraft = (draft: CommitmentDraft): DraftValidation => {
  const title = draft.title.trim()
  if (!title) return { kind: 'invalid', message: 'Give the commitment a name.' }

  if (Number.isNaN(draft.day.getTime())) {
    return { kind: 'invalid', message: 'Pick a valid date.' }
  }

  const start = combineDayAndTime(draft.day, draft.start)
  const end = combineDayAndTime(draft.day, draft.end)

  if (end.getTime() <= start.getTime()) {
    return { kind: 'invalid', message: 'The end time has to be after the start time.' }
  }

  return {
    kind: 'valid',
    payload: {
      title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      origin_source: 'manual',
    },
  }
}
