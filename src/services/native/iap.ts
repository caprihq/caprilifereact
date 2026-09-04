import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'
import type { CustomerInfo } from 'react-native-purchases'
import { logError } from '@/utils'
import { IAP_PRODUCT_MISSING, IAP_UNAVAILABLE } from '@/features/profile/logic/purchaseNotice'

/**
 * RevenueCat, native side.
 *
 * The iOS key and entitlement are carried over verbatim from the Capacitor
 * shell so the same RevenueCat project and products keep working — an existing
 * subscriber must not be treated as new.
 */

/**
 * Public SDK keys are designed to be embedded in client code
 * (RevenueCat → Project Settings → API Keys → Public SDK keys).
 *
 * ⚠️ ANDROID IS NOT CONFIGURED. CAPRI has only ever shipped on iOS, so no
 * Google Play key exists yet. Until one is added, purchases are unavailable on
 * Android and every entry point reports that plainly rather than configuring
 * RevenueCat with an Apple key — which fails with an opaque SDK error.
 */
const API_KEYS: Partial<Record<typeof Platform.OS, string>> = {
  ios: 'appl_UhKHaCHdhTOZrpGwOUvpIHHhGYE',
  // android: 'goog_XXXXXXXXXXXXXXXXXXXXXXXXX',
}

const ENTITLEMENT = 'capri_executive'

/**
 * Tagged rather than described, because these messages are for the log.
 *
 * `purchaseNotice` turns a code into the sentence the buyer reads; a thrown string
 * like "Unknown product: capri_executive_monthly" was reaching them verbatim.
 */
const iapError = (code: string, detail: string): Error =>
  Object.assign(new Error(detail), { code })

let configured = false

/** True when a key exists for the running platform. */
export const isIAPAvailable = (): boolean => !!API_KEYS[Platform.OS]

export const configureIAP = (): void => {
  if (configured) return
  const apiKey = API_KEYS[Platform.OS]
  if (!apiKey) return

  try {
    Purchases.configure({ apiKey })
    configured = true
  } catch (error) {
    logError('[CapriIAP] configure failed', error)
  }
}

const planFrom = (info: CustomerInfo): 'executive' | 'free' =>
  info.entitlements.active[ENTITLEMENT] ? 'executive' : 'free'

/** `Purchases.logIn(userId)` so RevenueCat's appUserID matches the Base44 id. */
export const setIAPUser = async (userId: unknown): Promise<null> => {
  if (typeof userId !== 'string' || !userId || !isIAPAvailable()) return null
  configureIAP()
  try {
    await Purchases.logIn(userId)
  } catch (error) {
    // Non-fatal: a failed logIn only degrades entitlement attribution.
    logError('[CapriIAP] logIn failed', error)
  }
  return null
}

/**
 * Buy a product by its store identifier.
 *
 * Throws on an unknown product — callers rely on that to surface a real
 * message rather than reporting a success that did not happen.
 */
export const purchaseProduct = async (
  productId: unknown,
): Promise<{ success: true; plan: 'executive' | 'free' }> => {
  if (!isIAPAvailable()) throw iapError(IAP_UNAVAILABLE, 'no store key for this platform')
  if (typeof productId !== 'string') {
    throw iapError(IAP_PRODUCT_MISSING, 'purchase called without a product id')
  }
  configureIAP()

  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages.find(
    (candidate) => candidate.product.identifier === productId,
  )
  if (!pkg) throw iapError(IAP_PRODUCT_MISSING, `no store package for ${productId}`)

  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return { success: true, plan: planFrom(customerInfo) }
}

export const restorePurchases = async (): Promise<{
  success: true
  plan: 'executive' | 'free'
}> => {
  if (!isIAPAvailable()) throw iapError(IAP_UNAVAILABLE, 'no store key for this platform')
  configureIAP()
  const customerInfo = await Purchases.restorePurchases()
  return { success: true, plan: planFrom(customerInfo) }
}
