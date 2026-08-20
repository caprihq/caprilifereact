/**
 * Getting the reset token out of whatever the user pastes.
 *
 * Base44's reset email links to its **hosted web page** —
 * `…/ResetPassword?token=…` — and that domain is not ours, so the app cannot claim
 * those links: an Android App Link or an iOS Universal Link needs a verification
 * file served from the domain itself. There is no deep link to intercept and no
 * dashboard setting that changes the email.
 *
 * So the token is carried across by hand. That sounds crude until you look at the
 * alternative, which is sending the user out to a web page to finish an account
 * action in an app that is otherwise entirely native. Accepting a paste keeps the
 * flow in the app, and accepting it *in any reasonable form* is what makes it
 * bearable: the whole link, the query string, or the bare token, with whitespace
 * from a sloppy selection trimmed off.
 */

/** Long enough that a stray word pasted by accident is not mistaken for a token. */
const MINIMUM_TOKEN = 8

/** `token`, then the names Base44 has used elsewhere for the same thing. */
const PARAMETER_NAMES = ['token', 'resetToken', 'reset_token'] as const

const fromQuery = (query: string): string | null => {
  const params = new URLSearchParams(query)

  for (const name of PARAMETER_NAMES) {
    const value = params.get(name)?.trim()
    if (value) return value
  }
  return null
}

/**
 * The token in a pasted link, query string or bare string — or `null`.
 *
 * Never throws: this runs on arbitrary clipboard content.
 */
export const extractResetToken = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null

  // A whole link. Both the query and the fragment are searched, because a hosted
  // page may route on either and the user cannot be expected to know which.
  const separator = trimmed.search(/[?#]/)
  if (separator !== -1) {
    const rest = trimmed.slice(separator + 1)
    return fromQuery(rest.replace('#', '&')) ?? fromQuery(rest.split('#')[1] ?? '')
  }

  // A link with no token at all. It must not fall through to the branch below and
  // be sent to the server as though the URL were the token — the failure would
  // surface as "invalid or expired", which sends the user hunting for a new email
  // when the real problem is that they copied the wrong line.
  if (trimmed.includes('://')) return null

  // A bare token. Anything with whitespace inside it is prose, not a token.
  if (/\s/.test(trimmed) || trimmed.length < MINIMUM_TOKEN) return null

  return trimmed
}
