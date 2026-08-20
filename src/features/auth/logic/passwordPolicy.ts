/**
 * One rule set for every place a password is set: sign-up, reset and change.
 *
 * Replaces `signUpValidation`, which covered only sign-up. Three screens with
 * three copies of "at least 8 characters" is how they drift apart, and a reset
 * screen that accepts a weaker password than sign-up is a real hole.
 *
 * Pure. The server remains the authority on whether an address is usable or a
 * password is strong enough; these checks avoid a round trip for mistakes we can
 * see locally, and catch the two things the server cannot — a mistyped
 * confirmation, and reusing the current password.
 */

export type Validation =
  | { readonly kind: 'valid' }
  | { readonly kind: 'invalid'; readonly message: string }

/** Base44 rejects shorter passwords; failing here saves a round trip. */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Deliberately permissive: one @ with something either side and a dot in the
 * domain. Anything stricter rejects addresses that genuinely work.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateEmail = (email: string): Validation => {
  const trimmed = email.trim()
  if (!trimmed) return { kind: 'invalid', message: 'Enter your email address.' }
  if (!LOOKS_LIKE_EMAIL.test(trimmed)) {
    return { kind: 'invalid', message: "That email address doesn't look right." }
  }
  return { kind: 'valid' }
}

/** Length only — the rule the server also enforces. */
export const validatePasswordStrength = (password: string): Validation => {
  if (!password) return { kind: 'invalid', message: 'Choose a password.' }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { kind: 'invalid', message: `Use at least ${String(MIN_PASSWORD_LENGTH)} characters.` }
  }
  return { kind: 'valid' }
}

/** The one rule the server cannot check for us. */
export const validateConfirmation = (password: string, confirm: string): Validation =>
  password === confirm
    ? { kind: 'valid' }
    : { kind: 'invalid', message: "Those passwords don't match." }

const firstProblem = (...checks: readonly Validation[]): Validation =>
  checks.find((check) => check.kind === 'invalid') ?? { kind: 'valid' }

export type SignUpDraft = {
  readonly email: string
  readonly password: string
  readonly confirm: string
}

export type SignUpValidation =
  | { readonly kind: 'valid'; readonly email: string; readonly password: string }
  | { readonly kind: 'invalid'; readonly message: string }

/** Sign-up: email, password, confirmation. Email problems are reported first. */
export const validateSignUp = (draft: SignUpDraft): SignUpValidation => {
  const problem = firstProblem(
    validateEmail(draft.email),
    validatePasswordStrength(draft.password),
    validateConfirmation(draft.password, draft.confirm),
  )
  if (problem.kind === 'invalid') return problem

  return { kind: 'valid', email: draft.email.trim(), password: draft.password }
}

/** Completing a reset: a new password and its confirmation. No email involved. */
export const validateNewPassword = (password: string, confirm: string): Validation =>
  firstProblem(validatePasswordStrength(password), validateConfirmation(password, confirm))

/**
 * Changing a password while signed in.
 *
 * The extra rule: the new password must differ from the current one. Base44
 * would accept a no-op change, which silently does nothing and looks like
 * success.
 */
export const validatePasswordChange = (
  current: string,
  next: string,
  confirm: string,
): Validation => {
  if (!current) return { kind: 'invalid', message: 'Enter your current password.' }

  const problem = firstProblem(validatePasswordStrength(next), validateConfirmation(next, confirm))
  if (problem.kind === 'invalid') return problem

  if (current === next) {
    return { kind: 'invalid', message: 'Your new password must be different.' }
  }
  return { kind: 'valid' }
}
