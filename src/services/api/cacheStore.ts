import { createMMKV } from 'react-native-mmkv'

/**
 * Where the query cache snapshot lives on disk.
 *
 * Its own MMKV instance rather than a key inside `capri.prefs`, for two reasons:
 * signing out has to wipe cached task data without touching the appearance
 * choice or the session hints, and this store is the only one that grows with
 * the size of a user's task list.
 *
 * NOT ENCRYPTED, DELIBERATELY
 *   MMKV lives in the app's sandbox, which iOS protects with the device
 *   passcode, and the same task titles are already written to the shared App
 *   Group so the widget can draw them. Encrypting here would mean a key, and the
 *   only safe home for a key is the Keychain — which is asynchronous, and this
 *   store is read during the first render precisely so there is no loading
 *   flash. Nothing secret goes in: the session token stays in the Keychain.
 */
const mmkv = createMMKV({ id: 'capri.querycache' })

const SNAPSHOT_KEY = 'capri.query.snapshot'

export const readCacheSnapshot = (): string | undefined => mmkv.getString(SNAPSHOT_KEY)

export const writeCacheSnapshot = (raw: string): void => {
  mmkv.set(SNAPSHOT_KEY, raw)
}

/**
 * Drop the snapshot.
 *
 * Called when a session ends. Without it the next person to sign in on this
 * device would see the previous user's tasks on the launch screen — for the
 * moment before the first fetch replaced them, which is a moment too long.
 */
export const clearCacheSnapshot = (): void => {
  mmkv.remove(SNAPSHOT_KEY)
}
