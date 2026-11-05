import { withStatedTime } from '../logic/statedTime'
import { parseTaskWithAI } from './aiTaskParser'
import { invokeAI } from './invokeAI'

jest.mock('./invokeAI', () => ({ invokeAI: jest.fn() }))
jest.mock('./aiUsageLog', () => ({ logAIUsage: jest.fn(() => Promise.resolve()) }))

const CHICAGO = 'America/Chicago'
/** Thursday 5 Nov 2026, 9:00 AM in Chicago (CST, UTC−6). */
const MORNING = Date.UTC(2026, 10, 5, 15, 0)
const context = { nowMs: MORNING, timeZone: CHICAGO, userEmail: null }
const mockedInvoke = invokeAI as jest.MockedFunction<typeof invokeAI>

describe('parseTaskWithAI', () => {
  beforeEach(() => mockedInvoke.mockReset())

  it('tells the model the user’s local day and how to write dates', async () => {
    mockedInvoke.mockResolvedValue({ title: 'Call mom' })
    await parseTaskWithAI('call mom tomorrow', context)

    const prompt = String(mockedInvoke.mock.calls[0]?.[1])
    expect(prompt).toContain('Today is Thursday, 2026-11-05')
    expect(prompt).toContain('"YYYY-MM-DD"')
  })

  it('keeps tonight’s dinner tonight when the model answers with a plain date', async () => {
    mockedInvoke.mockResolvedValue({ title: 'Dinner with friends', due_date: '2026-11-05' })
    const input = 'dinner with friends tonight at 7pm'
    const { draft, usedAI } = await parseTaskWithAI(input, context)

    expect(usedAI).toBe(true)
    // Read as midnight in London, this was 4 Nov in Chicago: yesterday's 7 PM.
    const event = withStatedTime(draft, input, { nowMs: MORNING, timeZone: CHICAGO })
    expect(event.scheduled_start_time).toBe('2026-11-06T01:00:00.000Z')
  })

  it('falls back to the local reading when the model’s date is unusable', async () => {
    mockedInvoke.mockResolvedValue({ title: 'Call mom', due_date: 'tomorrow' })
    const { draft } = await parseTaskWithAI('call mom tomorrow', context)
    expect(draft.due_date).toBe(new Date(MORNING + 24 * 60 * 60 * 1000).toISOString())
  })
})
