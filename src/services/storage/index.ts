import type { StateStorage } from 'zustand/middleware'

import { mmkvPrefStore } from './prefStore'

export { mmkvPrefStore, createMemoryPrefStore } from './prefStore'
export { keychainSecretStore } from './secretStore'
export { PREF_KEYS, SECRET_KEYS, KEYCHAIN_ACCESS_GROUP, keychainServiceFor } from './keys'
export type { PrefStore, SecretStore } from './keys'

/**
 * Zustand's `persist` adapter over MMKV.
 *
 * MMKV is synchronous, so rehydration completes before the first paint — which
 * is why the appearance choice can be applied without a flash of the wrong
 * theme. Zustand's interface allows promises; returning plain values is fine.
 */
export const zustandMmkvStorage: StateStorage = {
  getItem: (name) => mmkvPrefStore.getString(name) ?? null,
  setItem: (name, value) => {
    mmkvPrefStore.setString(name, value)
  },
  removeItem: (name) => {
    mmkvPrefStore.remove(name)
  },
}
