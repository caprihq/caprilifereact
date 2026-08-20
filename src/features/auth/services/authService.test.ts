import { PREF_KEYS, SECRET_KEYS, keychainServiceFor, mmkvPrefStore } from '@/services/storage'
import { __keychain } from '@/services/storage/testing/keychainFake'
import {
  clearSession,
  hadPreviousSession,
  knownProvider,
  persistSession,
  readStoredToken,
} from './authService'

/**
 * Session lifecycle over the real `secretStore` and the real MMKV double — only
 * the network is faked. That is the point: the storage path is what this feature
 * is about, so stubbing it would test nothing.
 *
 * `@/services/api` is mocked because importing it constructs the Base44 client,
 * which reaches for the network at load. `mockApplyToken` and `mockClearQueryCache` are
 * spies here; that both are actually *called* is what the phase-1 tests cover.
 */

// `mock`-prefixed by necessity: jest hoists the factory above these declarations
// and refuses any other out-of-scope name.
const mockApplyToken = jest.fn()
const mockClearQueryCache = jest.fn(() => Promise.resolve())

jest.mock('@/services/api', () => ({
  applyToken: (token: string | null) => mockApplyToken(token) as unknown,
  clearQueryCache: () => mockClearQueryCache(),
  base44: { auth: { me: jest.fn(), logout: jest.fn() } },
  isAuthFailure: jest.fn(() => false),
}))

/** A JWT whose payload names a provider and an expiry, so claims can be read. */
const jwt = (payload: Record<string, unknown>): string => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`
}

const TOKEN = jwt({ provider: 'Google', exp: 2_000_000_000 })

beforeEach(() => {
  __keychain.reset()
  mmkvPrefStore.remove(PREF_KEYS.hadSession)
  mmkvPrefStore.remove(PREF_KEYS.loginProvider)
  mmkvPrefStore.remove(PREF_KEYS.refreshUnsupportedAt)
  mockApplyToken.mockClear()
  mockClearQueryCache.mockClear()
})

describe('persistSession', () => {
  it('puts the token in the Keychain and nowhere else', async () => {
    await persistSession(TOKEN)

    expect(__keychain.rawValue(keychainServiceFor(SECRET_KEYS.accessToken))).toBe(TOKEN)

    // MMKV is not encrypted, so it may hold facts *about* the session and never
    // the session itself. Every known pref is checked, not just the likely ones.
    for (const key of Object.values(PREF_KEYS)) {
      expect(mmkvPrefStore.getString(key)).not.toBe(TOKEN)
    }
    expect(mmkvPrefStore.getString(PREF_KEYS.loginProvider)).toBe('google')
  })

  it('hands the token to the SDK, which holds the only in-memory copy', async () => {
    await persistSession(TOKEN)

    expect(mockApplyToken).toHaveBeenCalledWith(TOKEN)
  })

  it('records that this device has signed in, and how', async () => {
    await persistSession(TOKEN)

    expect(hadPreviousSession()).toBe(true)
    // Lower-cased, so 'Google' and 'google' cannot both be stored.
    expect(knownProvider()).toBe('google')
  })

  it('stores a token whose claims cannot be read — the server is the authority', async () => {
    await persistSession('not-a-jwt')

    await expect(readStoredToken()).resolves.toBe('not-a-jwt')
    expect(hadPreviousSession()).toBe(true)
    expect(knownProvider()).toBeUndefined()
  })
})

describe('clearSession', () => {
  it('removes the token from the Keychain', async () => {
    await persistSession(TOKEN)

    await clearSession('signedOut')

    await expect(readStoredToken()).resolves.toBeNull()
    expect(__keychain.services()).toHaveLength(0)
  })

  it('un-authenticates the SDK', async () => {
    await persistSession(TOKEN)
    mockApplyToken.mockClear()

    await clearSession('signedOut')

    // null, not '' — and the SDK patch is what makes this actually clear the
    // Authorization header rather than return early.
    expect(mockApplyToken).toHaveBeenCalledWith(null)
  })

  it('drops the cached data of the session that fetched it, on either reason', async () => {
    await persistSession(TOKEN)
    await clearSession('signedOut')
    expect(mockClearQueryCache).toHaveBeenCalledTimes(1)

    await persistSession(TOKEN)
    await clearSession('rejected')
    expect(mockClearQueryCache).toHaveBeenCalledTimes(2)
  })

  it('removes the token on either reason — that part is never conditional', async () => {
    await persistSession(TOKEN)

    await clearSession('rejected')

    await expect(readStoredToken()).resolves.toBeNull()
    expect(mockApplyToken).toHaveBeenCalledWith(null)
  })

  it('signedOut switches auto-resume off, so nothing signs the user back in', async () => {
    await persistSession(TOKEN)

    await clearSession('signedOut')

    expect(hadPreviousSession()).toBe(false)
    expect(knownProvider()).toBeUndefined()
  })

  it('rejected keeps this device resumable — an expired token is not a decision', async () => {
    await persistSession(TOKEN)

    await clearSession('rejected')

    // The Google/Apple session behind the token is usually still alive, so the
    // login screen can resume silently rather than demanding a sign-in that
    // would succeed immediately anyway. LoginScreen fires it once per mount.
    expect(hadPreviousSession()).toBe(true)
    expect(knownProvider()).toBe('google')
  })

  it('keeps what it should: the backend refresh capability is not a user fact', async () => {
    mmkvPrefStore.setString(PREF_KEYS.refreshUnsupportedAt, '1700000000000')

    await clearSession('signedOut')

    // Re-probing a refresh endpoint known to be absent, on every sign-out, would
    // be pointless traffic.
    expect(mmkvPrefStore.getString(PREF_KEYS.refreshUnsupportedAt)).toBe('1700000000000')
  })

  it('completes even when the Keychain rejects the delete', async () => {
    await persistSession(TOKEN)
    __keychain.failNextRemove(new Error('errSecItemNotFound'))

    await expect(clearSession('signedOut')).resolves.toBeUndefined()

    // The parts that do not depend on the platform must still have happened.
    expect(mockApplyToken).toHaveBeenCalledWith(null)
    expect(mockClearQueryCache).toHaveBeenCalledTimes(1)
    expect(hadPreviousSession()).toBe(false)
  })
})
