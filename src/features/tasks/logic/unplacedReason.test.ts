import { unplacedHeading, unplacedLine, unplacedReason } from './unplacedReason'

describe('unplacedReason', () => {
  it('gives each reason its own answer, because each has a different fix', () => {
    // Shorten the task, move the deadline, or accept the week is full: three
    // different decisions, so three different sentences.
    expect(unplacedReason('no_block_long_enough')).toBe('No free block long enough')
    expect(unplacedReason('no_time_before_due_date')).toBe('No free time before it is due')
    expect(unplacedReason('week_full')).toBe('Your week is full')
  })

  it('never shows a raw code for a reason it has not been taught', () => {
    // A newer backend must not put `no_block_long_enough` on someone's screen.
    expect(unplacedReason('some_future_reason')).toBe('Could not fit this week')
  })

  it('copes with no reason at all', () => {
    expect(unplacedReason(undefined)).toBe('Could not fit this week')
  })
})

describe('unplacedHeading', () => {
  it('carries the count, so it is never written by hand', () => {
    expect(unplacedHeading(3)).toBe('Needs attention (3)')
    expect(unplacedHeading(1)).toBe('Needs attention (1)')
  })
})

describe('unplacedLine', () => {
  it("prefers CAPRI's own reason when it gave one", () => {
    expect(
      unplacedLine({
        task_id: 't',
        reason: 'ai_not_scheduled',
        detail: 'Your week is already full; this can wait.',
      }),
    ).toBe('Your week is already full; this can wait.')
  })

  it('falls back to the wording for the code', () => {
    expect(unplacedLine({ task_id: 't', reason: 'ai_not_scheduled' })).toBe('Left for later this week')
    expect(unplacedLine({ task_id: 't', reason: 'week_full', detail: '   ' })).toBe('Your week is full')
  })
})
