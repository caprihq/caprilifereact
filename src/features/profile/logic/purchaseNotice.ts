import type { FeedbackTone } from '@/store'

/**
 * A failed purchase → what to tell the buyer, if anything.
 *
 * Two things were wrong with showing the store's own error text. It is written for
 * developers ("Unknown product: capri_executive_monthly", "There was a problem with
 * the App Store"), and **cancelling counts as a failure**: RevenueCat rejects when
 * someone taps Cancel on Apple's sheet, so backing out of a purchase produced a red
 * banner saying the purchase did not complete. The user knows. They cancelled it.
 *
 * `null` means say nothing, which is the correct response to a deliberate
 * cancellation.
 *
 * Pure so it can be tested without the store: the RevenueCat SDK cannot be loaded in
 * Jest, and this is precisely the logic worth testing (§3.5).
 */

export type PurchaseNotice = {
  readonly message: string
  readonly tone: FeedbackTone
}

/** Set by `iap.ts` on the failures it raises itself. */
export const IAP_UNAVAILABLE = 'iap_unavailable'
export const IAP_PRODUCT_MISSING = 'iap_product_missing'

const STORE_TROUBLE =
  'The App Store could not complete that. Please try again in a moment — you have not been charged.'

type ErrorShape = {
  readonly userCancelled?: unknown
  readonly code?: unknown
  readonly readableErrorCode?: unknown
  readonly message?: unknown
}

const read = (error: unknown): ErrorShape =>
  typeof error === 'object' && error !== null ? error : {}

const codeOf = (error: ErrorShape): string =>
  `${typeof error.code === 'string' ? error.code : ''} ${
    typeof error.readableErrorCode === 'string' ? error.readableErrorCode : ''
  }`.toUpperCase()

export const purchaseNotice = (error: unknown): PurchaseNotice | null => {
  const detail = read(error)

  // RevenueCat's own flag, and the reason this returns null at all.
  if (detail.userCancelled === true) return null

  const code = codeOf(detail)

  if (code.includes(IAP_UNAVAILABLE.toUpperCase())) {
    return {
      message: 'Purchases are not available on this device yet.',
      tone: 'warning',
    }
  }

  if (code.includes('ALREADY')) {
    return {
      message: 'You already have this plan. Tap Restore purchases to bring it back.',
      tone: 'info',
    }
  }

  if (code.includes('NETWORK')) {
    return {
      message: 'You appear to be offline. Reconnect and try again — nothing was charged.',
      tone: 'error',
    }
  }

  // Everything else — a store fault, a missing product, a payment the store would
  // not take — reads the same to the buyer: it did not go through, and their money
  // is untouched. Which of our own bugs caused it belongs in Crashlytics.
  return { message: STORE_TROUBLE, tone: 'error' }
}
