import { reportScreenChange } from './screenTracking'
import { trackScreen } from '@/services'

jest.mock('@/services', () => ({ trackScreen: jest.fn() }))

const at = (name: string | undefined) => ({ getCurrentRoute: () => (name ? { name } : undefined) })

beforeEach(() => {
  jest.clearAllMocks()
})

describe('reportScreenChange', () => {
  it('reports a tracked screen the user has moved to', () => {
    expect(reportScreenChange(at('Planner'), 'Home')).toBe('Planner')
    expect(trackScreen).toHaveBeenCalledWith('Planner')
  })

  it('stays quiet when nothing moved', () => {
    // Navigation state changes for reasons that are not a move — a param update, a
    // sheet resizing — and each would otherwise count as another visit.
    expect(reportScreenChange(at('Home'), 'Home')).toBe('Home')
    expect(trackScreen).not.toHaveBeenCalled()
  })

  it('does not send screens outside the catalogue, but still counts the move', () => {
    // Returning the name matters: coming back to Home afterwards has to report Home
    // again rather than looking like the user never left.
    expect(reportScreenChange(at('Privacy'), 'Home')).toBe('Privacy')
    expect(trackScreen).not.toHaveBeenCalled()
  })

  it('does nothing before the navigator is ready', () => {
    expect(reportScreenChange(at(undefined), null)).toBeNull()
    expect(trackScreen).not.toHaveBeenCalled()
  })
})
