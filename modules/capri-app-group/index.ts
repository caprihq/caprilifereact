import { NativeModules } from 'react-native'

/**
 * Typed access to the CapriAppGroup native module: shared storage the home-screen
 * widget can read, plus the one call that asks WidgetKit to redraw.
 *
 * Bare React Native, so this is a plain NativeModules lookup — absent until
 * `pod install` has run and the app has been rebuilt. Callers degrade instead of
 * crashing at import time.
 *
 * Three methods, because three are used. A get/exists pair existed here and was
 * called by nothing: compiled, shipped and unproven at runtime, which is worse than
 * absent. The widget reads this store directly in Swift; the app only ever writes.
 */
type CapriAppGroupModule = {
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
  reloadAll: () => Promise<void>
}

const nativeModule = (NativeModules as Record<string, unknown>).CapriAppGroup as
  | CapriAppGroupModule
  | undefined

export const appGroup = nativeModule
