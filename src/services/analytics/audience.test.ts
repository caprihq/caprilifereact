import {
  ACTIVATION_WINDOW_DAYS,
  daysSinceSignup,
  isInternalAccount,
  isNewAccount,
  userPropertiesFor,
} from './audience'

const NOW = Date.UTC(2026, 9, 28, 15, 0)

describe('isInternalAccount', () => {
  it('counts the team domain, in any case', () => {
    expect(isInternalAccount({ email: 'jennifer@caprihq.com' })).toBe(true)
    expect(isInternalAccount({ email: 'Someone@CapriHQ.com' })).toBe(true)
  })

  it('counts an admin on any domain', () => {
    expect(isInternalAccount({ email: 'tester@gmail.com', role: 'admin' })).toBe(true)
  })

  it('leaves customers alone, including look-alike domains', () => {
    expect(isInternalAccount({ email: 'someone@gmail.com', role: 'user' })).toBe(false)
    expect(isInternalAccount({ email: 'someone@notcaprihq.com' })).toBe(false)
  })
})

describe('daysSinceSignup', () => {
  it('counts whole days from the sign-up date', () => {
    expect(daysSinceSignup('2026-10-28T09:00:00.000Z', NOW)).toBe(0)
    expect(daysSinceSignup('2026-10-21T23:59:00.000Z', NOW)).toBe(7)
  })

  it("reads Base44's microsecond, zone-less timestamps", () => {
    // Not every engine parses six fractional digits, so only the date is read.
    expect(daysSinceSignup('2026-10-25T18:04:11.123456', NOW)).toBe(3)
  })

  it('returns null when the date is missing or unreadable', () => {
    expect(daysSinceSignup(undefined, NOW)).toBeNull()
    expect(daysSinceSignup('', NOW)).toBeNull()
    expect(daysSinceSignup('yesterday', NOW)).toBeNull()
  })

  it('never goes negative when the clocks disagree', () => {
    expect(daysSinceSignup('2026-10-29T00:00:00.000Z', NOW)).toBe(0)
  })
})

describe('isNewAccount', () => {
  it('holds for the activation window and no longer', () => {
    expect(isNewAccount(0)).toBe(true)
    expect(isNewAccount(ACTIVATION_WINDOW_DAYS)).toBe(true)
    expect(isNewAccount(ACTIVATION_WINDOW_DAYS + 1)).toBe(false)
  })

  it('treats an unknown age as not new', () => {
    // Otherwise every existing account with a missing date would "activate" again.
    expect(isNewAccount(null)).toBe(false)
  })
})

describe('userPropertiesFor', () => {
  it('always sets the plan, defaulting to free', () => {
    expect(userPropertiesFor({ email: 'a@gmail.com', plan: 'executive' })).toEqual({
      plan: 'executive',
    })
    expect(userPropertiesFor({ email: 'a@gmail.com' })).toEqual({ plan: 'free' })
  })

  it('marks internal accounts, and never writes "no"', () => {
    // A device a team member used stays marked; a later customer sign-in on it must
    // not quietly clear that.
    expect(userPropertiesFor({ email: 'jennifer@caprihq.com' })).toEqual({
      plan: 'free',
      internal_user: 'yes',
    })
    expect(userPropertiesFor({ email: 'a@gmail.com' })).not.toHaveProperty('internal_user')
  })
})
