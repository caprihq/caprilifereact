import { useEffect, useState } from 'react'

import { getStoreProducts } from '@/services/native'
import type { StoreProduct } from '@/services/native'

/**
 * Prices from the store, fetched once when the paywall opens.
 *
 * An empty list is the normal state on a simulator or with no network, and the
 * buttons fall back to naming the plan — so this never blocks the screen from
 * rendering, and never leaves someone staring at a spinner where a price should be.
 */
export const useStoreProducts = (): readonly StoreProduct[] => {
  const [products, setProducts] = useState<readonly StoreProduct[]>([])

  useEffect(() => {
    let active = true

    void getStoreProducts().then((fetched) => {
      if (active) setProducts(fetched)
    })

    return () => {
      active = false
    }
  }, [])

  return products
}
