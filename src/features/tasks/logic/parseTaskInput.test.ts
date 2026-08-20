import { parseTaskHeuristically } from './parseTaskInput'

/**
 * The heuristic parser is what free users get, and what every paid user falls
 * back to when the LLM call fails. It must never lose the task itself.
 */

const NOW = new Date('2026-08-12T12:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000

const dayOf = (iso: string | undefined) => iso?.slice(0, 10)

describe('parseTaskHeuristically', () => {
  it('always keeps the title, whatever else it finds', () => {
    expect(parseTaskHeuristically('Call the dentist', NOW).title).toBe('Call the dentist')
    expect(parseTaskHeuristically('  padded  ', NOW).title).toBe('padded')
  })

  it('reads relative dates', () => {
    expect(dayOf(parseTaskHeuristically('ship it today', NOW).due_date)).toBe('2026-08-12')
    expect(dayOf(parseTaskHeuristically('ship it tomorrow', NOW).due_date)).toBe('2026-08-13')
    expect(dayOf(parseTaskHeuristically('ship it next week', NOW).due_date)).toBe(
      new Date(NOW + 7 * DAY).toISOString().slice(0, 10),
    )
  })

  it('leaves the due date unset when no date word appears', () => {
    expect(parseTaskHeuristically('ship it', NOW).due_date).toBeUndefined()
  })

  it('reads durations in minutes and hours', () => {
    expect(parseTaskHeuristically('standup 15 min', NOW).estimated_minutes).toBe(15)
    expect(parseTaskHeuristically('deep work 2 hours', NOW).estimated_minutes).toBe(120)
    expect(parseTaskHeuristically('review 1 hr', NOW).estimated_minutes).toBe(60)
  })

  it('reads urgency words', () => {
    expect(parseTaskHeuristically('urgent: fix build', NOW).priority).toBe('critical')
    expect(parseTaskHeuristically('important review', NOW).priority).toBe('high')
    expect(parseTaskHeuristically('tidy desk', NOW).priority).toBeUndefined()
  })

  it('picks up a category when one is named', () => {
    expect(parseTaskHeuristically('work on the deck', NOW).category).toBe('work')
    expect(parseTaskHeuristically('health checkup', NOW).category).toBe('health')
    expect(parseTaskHeuristically('random thing', NOW).category).toBeUndefined()
  })

  it('combines every signal in one sentence', () => {
    const parsed = parseTaskHeuristically('urgent work call tomorrow 30 min', NOW)
    expect(parsed.priority).toBe('critical')
    expect(parsed.category).toBe('work')
    expect(parsed.estimated_minutes).toBe(30)
    expect(dayOf(parsed.due_date)).toBe('2026-08-13')
  })

  it('never throws on odd input', () => {
    for (const input of ['', '   ', '🎉', '999999 hours', 'today tomorrow next week']) {
      expect(() => parseTaskHeuristically(input, NOW)).not.toThrow()
    }
  })
})
