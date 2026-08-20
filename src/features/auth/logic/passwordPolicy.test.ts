import {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validateNewPassword,
  validatePasswordChange,
  validateSignUp,
} from './passwordPolicy'

const good = 'correct-horse'
const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)

describe('validateEmail', () => {
  it('accepts addresses that look unusual but are valid', () => {
    for (const email of ['a+tag@example.co.uk', "o'brien@example.com", 'x_y-z@sub.example.io']) {
      expect(validateEmail(email).kind).toBe('valid')
    }
  })

  it('rejects obviously malformed addresses', () => {
    for (const email of ['', '   ', 'nope', 'no@domain', 'a b@x.com', '@example.com', 'a@b.']) {
      expect(validateEmail(email).kind).toBe('invalid')
    }
  })
})

describe('validateSignUp', () => {
  it('accepts a well-formed draft and trims the email', () => {
    const result = validateSignUp({ email: '  a@b.com  ', password: good, confirm: good })
    expect(result).toEqual({ kind: 'valid', email: 'a@b.com', password: good })
  })

  it('never trims the password — spaces can be deliberate', () => {
    const spaced = ' has spaces '
    const result = validateSignUp({ email: 'a@b.com', password: spaced, confirm: spaced })
    if (result.kind !== 'valid') throw new Error('expected valid')
    expect(result.password).toBe(spaced)
  })

  it('enforces the minimum length at the boundary', () => {
    expect(validateSignUp({ email: 'a@b.com', password: short, confirm: short }).kind).toBe('invalid')
    expect(validateSignUp({ email: 'a@b.com', password: exact, confirm: exact }).kind).toBe('valid')
  })

  it('rejects a mismatched confirmation', () => {
    const result = validateSignUp({ email: 'a@b.com', password: good, confirm: 'other-one' })
    expect(result.kind).toBe('invalid')
    if (result.kind === 'invalid') expect(result.message).toMatch(/match/i)
  })

  it('reports the email problem before the password one', () => {
    const result = validateSignUp({ email: '', password: '', confirm: '' })
    if (result.kind !== 'invalid') throw new Error('expected invalid')
    expect(result.message).toMatch(/email/i)
  })
})

describe('validateNewPassword — completing a reset', () => {
  it('applies the same strength rule as sign-up', () => {
    // A reset screen that accepts a weaker password than sign-up is a real hole.
    expect(validateNewPassword(short, short).kind).toBe('invalid')
    expect(validateNewPassword(exact, exact).kind).toBe('valid')
  })

  it('requires the confirmation to match', () => {
    expect(validateNewPassword(good, 'different').kind).toBe('invalid')
  })
})

describe('validatePasswordChange', () => {
  it('accepts a genuine change', () => {
    expect(validatePasswordChange('old-password', good, good).kind).toBe('valid')
  })

  it('requires the current password', () => {
    const result = validatePasswordChange('', good, good)
    expect(result.kind).toBe('invalid')
    if (result.kind === 'invalid') expect(result.message).toMatch(/current/i)
  })

  it('rejects reusing the current password', () => {
    // Base44 would accept a no-op change, which looks like success but does
    // nothing.
    const result = validatePasswordChange(good, good, good)
    expect(result.kind).toBe('invalid')
    if (result.kind === 'invalid') expect(result.message).toMatch(/different/i)
  })

  it('checks strength and confirmation before the reuse rule', () => {
    const result = validatePasswordChange(short, short, short)
    if (result.kind !== 'invalid') throw new Error('expected invalid')
    expect(result.message).toMatch(/characters/i)
  })
})
