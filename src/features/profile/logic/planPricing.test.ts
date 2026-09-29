import { hasPrices, priceLabelFor } from './planPricing'

const monthly = { id: 'capri_executive_monthly', label: 'Executive — Monthly' }

describe('priceLabelFor', () => {
  it('puts the store price on the button', () => {
    // Before this, the button said "Executive — Monthly" and the price appeared
    // only in Apple's confirmation sheet, after the user had committed to buying.
    expect(
      priceLabelFor(monthly, [{ id: 'capri_executive_monthly', priceString: '£4.99' }]),
    ).toBe('Executive — Monthly · £4.99')
  })

  it('uses whatever the store formatted, currency and all', () => {
    // Localisation is the store's job; formatting it ourselves gets it wrong abroad.
    expect(priceLabelFor(monthly, [{ id: monthly.id, priceString: '¥800' }])).toContain('¥800')
  })

  it('still names the plan when the store is unreachable', () => {
    expect(priceLabelFor(monthly, [])).toBe('Executive — Monthly')
  })

  it('ignores a price for a different product', () => {
    expect(priceLabelFor(monthly, [{ id: 'something_else', priceString: '£9.99' }])).toBe(
      'Executive — Monthly',
    )
  })
})

describe('hasPrices', () => {
  it('knows whether the store has answered', () => {
    expect(hasPrices([])).toBe(false)
    expect(hasPrices([{ id: 'x', priceString: '£1' }])).toBe(true)
  })
})
