import { createMMKV } from 'react-native-mmkv'

import type { PrefStore } from './keys'

// react-native-mmkv v4 exports `MMKV` as a type only; instances come from
// createMMKV (the v3 `new MMKV()` constructor is gone).
const mmkv = createMMKV({ id: 'capri.prefs' })

/**
 * Synchronous preference store.
 *
 * Synchronous on purpose: the theme is read during the first render and the
 * session hint is read on the launch path, so an async store would force a
 * loading flash into both (guidelines §4.4).
 *
 * Never put a token in here — MMKV is not the Keychain. Use `secretStore`.
 */
export const mmkvPrefStore: PrefStore = {
  getString: (key) => mmkv.getString(key),
  setString: (key, value) => mmkv.set(key, value),
  getBoolean: (key) => mmkv.getBoolean(key),
  setBoolean: (key, value) => mmkv.set(key, value),
  // v4 renamed delete() to remove(); the boolean return is not meaningful here.
  remove: (key) => void mmkv.remove(key),
}

/** In-memory doubles for tests. No device APIs touched. */
export const createMemoryPrefStore = (): PrefStore => {
  const map = new Map<string, string | boolean>()
  return {
    getString: (k) => (typeof map.get(k) === 'string' ? (map.get(k) as string) : undefined),
    setString: (k, v) => void map.set(k, v),
    getBoolean: (k) => (typeof map.get(k) === 'boolean' ? (map.get(k) as boolean) : undefined),
    setBoolean: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  }
}
