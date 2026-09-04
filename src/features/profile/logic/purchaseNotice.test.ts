import { IAP_PRODUCT_MISSING, IAP_UNAVAILABLE, purchaseNotice } from './purchaseNotice'

describe('purchaseNotice', () => {
  it('says nothing when the buyer cancelled', () => {
    // RevenueCat rejects on Cancel, so this used to show a red "purchase did not
    // complete" banner to someone who had just chosen not to buy.
    expect(purchaseNotice({ userCancelled: true, message: 'Purchase was cancelled.' })).toBeNull()
  })

  it('never repeats the store\'s own wording', () => {
    const notice = purchaseNotice(new Error('Unknown product: capri_executive_monthly'))

    expect(notice?.message).not.toContain('capri_executive_monthly')
    expect(notice?.message).toContain('not been charged')
  })

  it('reassures the buyer that nothing was taken', () => {
    // The one question anybody has when a payment fails.
    expect(purchaseNotice({ code: IAP_PRODUCT_MISSING })?.message).toContain('not been charged')
    expect(purchaseNotice({ readableErrorCode: 'STORE_PROBLEM' })?.message).toContain(
      'not been charged',
    )
  })

  it('points an existing subscriber at Restore rather than at an error', () => {
    const notice = purchaseNotice({ readableErrorCode: 'PRODUCT_ALREADY_PURCHASED' })

    expect(notice?.tone).toBe('info')
    expect(notice?.message).toContain('Restore')
  })

  it('names the connection when the store could not be reached', () => {
    expect(purchaseNotice({ readableErrorCode: 'NETWORK_ERROR' })?.message).toContain('offline')
  })

  it('is a warning, not an error, where the platform simply has no store yet', () => {
    // Android has no RevenueCat key. Nothing is broken; it is not available.
    const notice = purchaseNotice({ code: IAP_UNAVAILABLE })

    expect(notice?.tone).toBe('warning')
    expect(notice?.message).toContain('not available on this device')
  })
})
