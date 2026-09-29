import type { StoreProduct } from '@/services/native'

/**
 * What a purchase button says.
 *
 * The price belongs on the button, not behind it. Asking someone to tap *buy* to
 * discover the cost is both a poor way to ask for money and the thing App Review
 * checks on a subscription screen.
 *
 * When the store cannot be reached the plan is still named, without a figure —
 * better a button that says what it is than one that invents a price or disappears.
 */

export type PlanOption = {
  readonly id: string
  readonly label: string
}

export const priceLabelFor = (
  option: PlanOption,
  products: readonly StoreProduct[],
): string => {
  const price = products.find((product) => product.id === option.id)?.priceString
  return price ? `${option.label} · ${price}` : option.label
}

/** True once the store has answered, so the screen can wait rather than flash a price in. */
export const hasPrices = (products: readonly StoreProduct[]): boolean => products.length > 0
