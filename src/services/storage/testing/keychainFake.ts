/**
 * In-memory stand-in for react-native-keychain, installed by `jest.setup.ts`.
 *
 * The previous stub answered `getGenericPassword` with a constant `false`, so no
 * test could exercise `secretStore` or anything above it: a token could be
 * written and the read would still report "no session". Nothing verified that the
 * store worked at all.
 *
 * This keeps entries per **service**, exactly as the real Keychain does, so a
 * cross-key collision fails here rather than on a device. It also records the
 * options it was called with, which is how the accessibility and Android storage
 * choices — security decisions with no other observable effect in JS — get
 * asserted.
 *
 * Deliberately not importing react-native-keychain: an ESLint rule confines that
 * to `secretStore.ts`, and a fake that imported the thing it replaces could load
 * the native module it exists to avoid. The enum values below are the library's
 * own strings, so a rename upstream fails a test instead of passing silently.
 */

type Entry = { readonly username: string; readonly password: string }

export type RecordedCall = {
  readonly service?: string
  readonly accessible?: string
  readonly storage?: string
}

const entries = new Map<string, Entry>()
const writes: RecordedCall[] = []
const reads: RecordedCall[] = []
const removals: RecordedCall[] = []

/** Set to make the next call fail, as a locked, full or corrupt store would. */
let failNextRead: Error | null = null
let failNextRemove: Error | null = null
let failNextWrite: Error | null = null

const serviceOf = (options?: { service?: string }): string => options?.service ?? '(default)'

export const keychainFake = {
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
  },
  STORAGE_TYPE: {
    AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth',
    AES_GCM: 'KeystoreAESGCM',
    RSA: 'KeystoreRSAECB',
  },
  SECURITY_LEVEL: {
    ANY: 'ANY',
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    SECURE_HARDWARE: 'SECURE_HARDWARE',
  },

  setGenericPassword: (username: string, password: string, options?: RecordedCall) => {
    writes.push({ ...options })
    if (failNextWrite) {
      const error = failNextWrite
      failNextWrite = null
      return Promise.reject(error)
    }
    entries.set(serviceOf(options), { username, password })
    // The real module answers with where it ended up storing the item.
    return Promise.resolve({
      service: serviceOf(options),
      storage: options?.storage ?? 'KeystoreAESGCM_NoAuth',
    })
  },

  getGenericPassword: (options?: RecordedCall) => {
    reads.push({ ...options })
    if (failNextRead) {
      const error = failNextRead
      failNextRead = null
      return Promise.reject(error)
    }
    const entry = entries.get(serviceOf(options))
    // `false`, not null — the real API's way of saying "nothing stored".
    if (!entry) return Promise.resolve(false as const)
    return Promise.resolve({ ...entry, service: serviceOf(options), storage: 'KeystoreAESGCM_NoAuth' })
  },

  resetGenericPassword: (options?: RecordedCall) => {
    removals.push({ ...options })
    if (failNextRemove) {
      const error = failNextRemove
      failNextRemove = null
      return Promise.reject(error)
    }
    return Promise.resolve(entries.delete(serviceOf(options)))
  },
}

/** Test helpers. Named with a `__` prefix so they read as scaffolding at call sites. */
export const __keychain = {
  reset: (): void => {
    entries.clear()
    writes.length = 0
    reads.length = 0
    removals.length = 0
    failNextRead = null
    failNextRemove = null
    failNextWrite = null
  },
  /** Raw stored value, to prove what actually landed in the store. */
  rawValue: (service: string): string | undefined => entries.get(service)?.password,
  services: (): string[] => [...entries.keys()],
  writes: (): readonly RecordedCall[] => writes,
  reads: (): readonly RecordedCall[] => reads,
  removals: (): readonly RecordedCall[] => removals,
  failNextRead: (error: Error): void => {
    failNextRead = error
  },
  failNextRemove: (error: Error): void => {
    failNextRemove = error
  },
  failNextWrite: (error: Error): void => {
    failNextWrite = error
  },
}
