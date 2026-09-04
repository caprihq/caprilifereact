/**
 * The one failure a caller may want to treat differently: the server refused a model
 * call on plan grounds, so the honest response is an upgrade prompt rather than
 * "try again".
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
