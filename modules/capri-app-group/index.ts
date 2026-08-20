import { NativeModules } from 'react-native'

/**
 * Typed access to the CapriAppGroup native module.
 *
 * Bare React Native, so this is a plain NativeModules lookup — absent until
 * `pod install` has run and the app has been rebuilt. Callers degrade instead
 * of crashing at import time.
 */
type CapriAppGroupModule = {
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
  getItem: (key: string) => Promise<string | null>
  isAvailable: () => boolean
}

const nativeModule = (NativeModules as Record<string, unknown>).CapriAppGroup as
  | CapriAppGroupModule
  | undefined

export const isAppGroupAvailable = (): boolean => {
  try {
    return nativeModule?.isAvailable() ?? false
  } catch {
    return false
  }
}

export const appGroup = nativeModule
