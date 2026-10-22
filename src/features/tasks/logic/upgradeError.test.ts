import {
  dailyLimitError,
  isDailyLimit,
  isUpgradeRequired,
  refusalCodeOf,
  refusalError,
  upgradeRequiredError,
} from './upgradeError'

/**
 * The refusal a caller has to be able to recognise.
 *
 * When the backend blocks a paid model call, the honest response is an upgrade
 * prompt — not "try again", which is what every other failure means. A tag rather
 * than a subclass check, because the value crosses a `catch` and a bundler boundary
 * before anyone inspects it.
 */
describe('isUpgradeRequired', () => {
  it('recognises the server refusing on plan grounds', () => {
    expect(isUpgradeRequired(upgradeRequiredError('subtasks'))).toBe(true)
  })

  it('does not mistake an ordinary failure for a refusal', () => {
    // A network error must read as "try again", or a user on a paid plan is told to
    // upgrade to something they already have.
    expect(isUpgradeRequired(new Error('Network request failed'))).toBe(false)
    expect(isUpgradeRequired({ code: 'rate_limited' })).toBe(false)
  })

  it('survives the values a catch block actually receives', () => {
    expect(isUpgradeRequired(null)).toBe(false)
    expect(isUpgradeRequired(undefined)).toBe(false)
    expect(isUpgradeRequired('upgrade_required')).toBe(false)
  })
})

describe('isDailyLimit', () => {
  it('recognises the server refusing because the day is used up', () => {
    expect(isDailyLimit(dailyLimitError('subtasks'))).toBe(true)
  })

  it('keeps the two refusals apart', () => {
    // "Upgrade" to someone already paying, or "it resets tomorrow" to someone on the
    // wrong plan, would both be wrong.
    expect(isDailyLimit(upgradeRequiredError('subtasks'))).toBe(false)
    expect(isUpgradeRequired(dailyLimitError('subtasks'))).toBe(false)
  })

  it('survives the values a catch block actually receives', () => {
    expect(isDailyLimit(null)).toBe(false)
    expect(isDailyLimit(new Error('daily_limit'))).toBe(false)
  })
})

describe('refusalCodeOf', () => {
  it('reads a refusal returned as data', () => {
    expect(refusalCodeOf({ data: { error: 'daily_limit' } })).toBe('daily_limit')
  })

  it('reads a refusal thrown by axios for a 4xx', () => {
    // How the Base44 functions client actually delivers a 403 or 429.
    const thrown = Object.assign(new Error('Request failed with status code 429'), {
      response: { status: 429, data: { error: 'daily_limit', feature: 'subtasks' } },
    })
    expect(refusalCodeOf(thrown)).toBe('daily_limit')
  })

  it('finds nothing in an ordinary result or failure', () => {
    expect(refusalCodeOf({ data: { result: { ok: true } } })).toBeUndefined()
    expect(refusalCodeOf(new Error('Network request failed'))).toBeUndefined()
    expect(refusalCodeOf(null)).toBeUndefined()
  })
})

describe('refusalError', () => {
  it('maps each code to its tagged error and anything else to null', () => {
    expect(isUpgradeRequired(refusalError('upgrade_required', 'subtasks'))).toBe(true)
    expect(isDailyLimit(refusalError('daily_limit', 'subtasks'))).toBe(true)
    expect(refusalError('Internal error', 'subtasks')).toBeNull()
    expect(refusalError(undefined, 'subtasks')).toBeNull()
  })
})
