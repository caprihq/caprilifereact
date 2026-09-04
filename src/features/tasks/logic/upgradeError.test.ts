import { isUpgradeRequired, upgradeRequiredError } from './upgradeError'

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
