import { extractResetToken } from './resetToken'

/**
 * What a user actually pastes out of a reset email.
 *
 * The token cannot arrive by deep link — Base44's email points at its own hosted
 * page, on a domain we cannot claim — so this parser is the whole bridge between the
 * email and the app. Every case below is something a real paste looks like.
 */

describe('extractResetToken', () => {
  it('reads the token out of a pasted reset link', () => {
    expect(
      extractResetToken('https://capriforlifev1.base44.app/ResetPassword?token=abc123def456'),
    ).toBe('abc123def456')
  })

  it('survives extra parameters in any order', () => {
    expect(extractResetToken('https://x.app/reset?from=email&token=abc123def456&lang=en')).toBe(
      'abc123def456',
    )
  })

  it('finds a token carried in the fragment', () => {
    // Hosted pages that route on the hash put it after `#`, and the user has no way
    // of knowing the difference.
    expect(extractResetToken('https://x.app/reset#token=abc123def456')).toBe('abc123def456')
  })

  it('accepts the names Base44 uses elsewhere for the same value', () => {
    expect(extractResetToken('https://x.app/reset?resetToken=abc123def456')).toBe('abc123def456')
    expect(extractResetToken('https://x.app/reset?reset_token=abc123def456')).toBe('abc123def456')
  })

  it('accepts a bare token, trimmed', () => {
    // Copying from an email drags whitespace along more often than not.
    expect(extractResetToken('  abc123def456\n')).toBe('abc123def456')
  })

  it('refuses prose, empty input and stray short words', () => {
    // A link with no token is the case that matters: it must not resolve to the URL
    // itself and then fail confusingly at the server.
    expect(extractResetToken('https://capriforlifev1.base44.app/ResetPassword')).toBeNull()
    expect(extractResetToken('here is your reset link')).toBeNull()
    expect(extractResetToken('   ')).toBeNull()
    expect(extractResetToken('')).toBeNull()
    expect(extractResetToken('short')).toBeNull()
  })
})
