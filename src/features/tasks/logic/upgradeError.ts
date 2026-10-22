/**
 * The two failures a caller may want to treat differently from "try again":
 *  - the server refused a model call on plan grounds, so the honest response is an
 *    upgrade prompt;
 *  - the server refused it because today's allowance is spent, so trying again
 *    today will fail the same way and the user should be told it resets tomorrow.
 *
 * A tagged Error rather than a subclass — §2.2 rules out classes, and a tag survives
 * the trip through a `catch` and across a bundler boundary, which an `instanceof`
 * check does not reliably do.
 *
 * Pure and here rather than beside the network call so it can be tested without
 * loading the Base44 SDK (§3.5).
 */

export const UPGRADE_REQUIRED = 'upgrade_required'

export const upgradeRequiredError = (feature: string): Error =>
  Object.assign(new Error(`${feature} requires an Executive plan`), {
    code: UPGRADE_REQUIRED,
    feature,
  })

export const isUpgradeRequired = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { readonly code?: string }).code === UPGRADE_REQUIRED

export const DAILY_LIMIT = 'daily_limit'

export const dailyLimitError = (feature: string): Error =>
  Object.assign(new Error(`${feature} has reached today's limit`), {
    code: DAILY_LIMIT,
    feature,
  })

export const isDailyLimit = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { readonly code?: string }).code === DAILY_LIMIT

/** What to tell someone whose allowance for a feature is spent. */
export const DAILY_LIMIT_MESSAGE = "You've reached today's limit for this. It resets tomorrow."

const errorField = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null) return undefined
  const error = (body as { readonly error?: unknown }).error
  return typeof error === 'string' ? error : undefined
}

/**
 * The refusal code in a function reply, wherever the SDK put it.
 *
 * The Base44 functions client is plain axios with no response interceptor, so a
 * 403 or 429 arrives as a thrown error carrying the body in `response.data` — not as
 * a resolved `{ data }`. Reading only the resolved shape meant neither refusal was
 * ever recognised. Both shapes are read, so this holds whichever way the SDK goes.
 */
export const refusalCodeOf = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null) return undefined
  const { data, response } = value as { readonly data?: unknown; readonly response?: { readonly data?: unknown } }
  return errorField(data) ?? errorField(response?.data)
}

/** The tagged error for a refusal code, or null when the code is not one. */
export const refusalError = (code: string | undefined, feature: string): Error | null => {
  if (code === UPGRADE_REQUIRED) return upgradeRequiredError(feature)
  if (code === DAILY_LIMIT) return dailyLimitError(feature)
  return null
}
