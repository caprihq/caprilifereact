import { FEATURES, hasAccess, isPaidPlan, labelFor, tierOf } from './plans'

describe('plan tiers', () => {
  it('orders free < executive < chief_of_staff', () => {
    expect(tierOf('free')).toBeLessThan(tierOf('executive'))
    expect(tierOf('executive')).toBeLessThan(tierOf('chief_of_staff'))
  })

  it('treats the legacy "pro" plan as executive — early subscribers depend on it', () => {
    expect(tierOf('pro')).toBe(tierOf('executive'))
    expect(hasAccess('pro', 'auto_schedule')).toBe(true)
    expect(labelFor('pro')).toBe(labelFor('executive'))
  })

  it('defaults an unknown or missing plan to free', () => {
    expect(tierOf(undefined)).toBe(0)
    expect(isPaidPlan(undefined)).toBe(false)
  })
})

describe('feature gating', () => {
  it('locks every paid feature for free users', () => {
    for (const feature of FEATURES) {
      expect(hasAccess('free', feature)).toBe(false)
    }
  })

  it('unlocks every listed feature for executive', () => {
    for (const feature of FEATURES) {
      expect(hasAccess('executive', feature)).toBe(true)
    }
  })

  it('gates analytics — omitting it once handed free users unlimited AI', () => {
    // Regression guard for the exact bug documented in the web client.
    expect(hasAccess('free', 'analytics')).toBe(false)
    expect(hasAccess('executive', 'analytics')).toBe(true)
  })

  it('gives chief_of_staff everything executive has', () => {
    for (const feature of FEATURES) {
      expect(hasAccess('chief_of_staff', feature)).toBe(true)
    }
  })
})
