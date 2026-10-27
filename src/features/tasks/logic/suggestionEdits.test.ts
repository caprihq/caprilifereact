import { clashFor, conflictKey, retimed, withSuggestion } from './suggestionEdits'

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 9, 27, hour, minute))
const iso = (hour: number, minute = 0) => at(hour, minute).toISOString()

const suggestion = (id: string, startH: number, endH: number) => ({
  task_id: id,
  suggested_time: iso(startH),
  suggested_end: iso(endH),
  reason: 'CAPRI said so.',
  task: { title: id },
})

describe('retimed', () => {
  it('keeps the length and replaces CAPRI\'s reason', () => {
    const moved = retimed(suggestion('report', 9, 11), at(14))
    expect(moved.suggested_time).toBe(iso(14))
    expect(moved.suggested_end).toBe(iso(16))
    expect(moved.reason).toBe('At the time you chose.')
  })
})

describe('withSuggestion', () => {
  it('puts the fresh one first and drops the old one for that task', () => {
    const list = [suggestion('a', 9, 10), suggestion('b', 10, 11)]
    const next = withSuggestion(list, suggestion('b', 15, 16))
    expect(next.map((s) => [s.task_id, s.suggested_time])).toEqual([['b', iso(15)], ['a', iso(9)]])
  })
})

describe('clashFor', () => {
  const occupied = [{ title: 'Team meeting', start: iso(14), end: iso(15) }]

  it('names a booked item the new time lands on', () => {
    expect(clashFor(suggestion('r', 14, 15), { others: [], occupied })?.title).toBe('Team meeting')
  })

  it('names another suggestion still on screen', () => {
    const other = suggestion('gym', 9, 10)
    expect(clashFor(suggestion('r', 9, 10), { others: [other], occupied: [] })?.title).toBe('gym')
  })

  it('does not clash with itself, and is quiet when the time is free', () => {
    const s = suggestion('r', 16, 17)
    expect(clashFor(s, { others: [s], occupied })).toBeUndefined()
  })
})

describe('conflictKey', () => {
  it('changes when either time changes', () => {
    const base = { task_id: 't', task_title: 'T', start: iso(9), end: iso(10), with_title: 'M', with_start: iso(9), with_end: iso(10) }
    expect(conflictKey(base)).not.toBe(conflictKey({ ...base, start: iso(9, 30) }))
  })
})
