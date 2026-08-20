import { combineDayAndTime, validateCommitmentDraft } from './commitmentDraft'
import type { CommitmentDraft } from './commitmentDraft'

const at = (hours: number, minutes = 0): Date => new Date(2000, 0, 1, hours, minutes)

const draft = (overrides: Partial<CommitmentDraft> = {}): CommitmentDraft => ({
  title: 'Family dinner',
  day: new Date(2026, 2, 10),
  start: at(18),
  end: at(19),
  ...overrides,
})

describe('combineDayAndTime', () => {
  it('takes the date from one value and the clock from the other', () => {
    const combined = combineDayAndTime(new Date(2026, 2, 10), at(18, 30))
    expect(combined.getFullYear()).toBe(2026)
    expect(combined.getMonth()).toBe(2)
    expect(combined.getDate()).toBe(10)
    expect(combined.getHours()).toBe(18)
    expect(combined.getMinutes()).toBe(30)
  })

  it('zeroes seconds so two commitments an hour apart differ by exactly an hour', () => {
    const combined = combineDayAndTime(new Date(2026, 2, 10), new Date(2026, 5, 5, 9, 15, 44, 900))
    expect(combined.getSeconds()).toBe(0)
    expect(combined.getMilliseconds()).toBe(0)
  })
})

describe('validateCommitmentDraft', () => {
  it('accepts a well-formed draft', () => {
    const result = validateCommitmentDraft(draft())
    expect(result.kind).toBe('valid')
  })

  it('records the times as local, matching what the user picked', () => {
    const result = validateCommitmentDraft(draft())
    if (result.kind !== 'valid') throw new Error('expected a valid draft')

    const start = new Date(String(result.payload.start_time))
    expect(start.getHours()).toBe(18)
    expect(start.getDate()).toBe(10)
  })

  it('marks the commitment as manually created', () => {
    const result = validateCommitmentDraft(draft())
    if (result.kind !== 'valid') throw new Error('expected a valid draft')
    expect(result.payload.origin_source).toBe('manual')
  })

  it('trims the title', () => {
    const result = validateCommitmentDraft(draft({ title: '  Dinner  ' }))
    if (result.kind !== 'valid') throw new Error('expected a valid draft')
    expect(result.payload.title).toBe('Dinner')
  })

  it('rejects a blank title', () => {
    expect(validateCommitmentDraft(draft({ title: '   ' })).kind).toBe('invalid')
  })

  it('rejects an end at or before the start — the web version saved these', () => {
    expect(validateCommitmentDraft(draft({ start: at(19), end: at(18) })).kind).toBe('invalid')
    expect(validateCommitmentDraft(draft({ start: at(19), end: at(19) })).kind).toBe('invalid')
  })

  it('rejects an unreadable day', () => {
    expect(validateCommitmentDraft(draft({ day: new Date('nonsense') })).kind).toBe('invalid')
  })
})
