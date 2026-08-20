import { SECRET_KEYS, keychainServiceFor } from './keys'
import { keychainSecretStore } from './secretStore'
import { __keychain } from './testing/keychainFake'

/**
 * The store that holds the session token, tested against a stateful in-memory
 * Keychain. Until now nothing exercised it at all — the old stub answered every
 * read with "nothing stored", so a broken write would have looked identical to a
 * working one.
 *
 * The security-relevant assertions are the options: `accessible` and the Android
 * `storage` type have no observable effect in JS, so a regression that dropped
 * them would be invisible without checking they were passed.
 */

beforeEach(() => {
  __keychain.reset()
})

describe('keychainSecretStore', () => {
  it('stores and reads a value back', async () => {
    await keychainSecretStore.set(SECRET_KEYS.accessToken, 'jwt-value')

    await expect(keychainSecretStore.get(SECRET_KEYS.accessToken)).resolves.toBe('jwt-value')
  })

  it('reports absence as null, not as the API\'s `false`', async () => {
    // `secretStore` exists partly to hide that quirk; callers branch on null.
    await expect(keychainSecretStore.get(SECRET_KEYS.accessToken)).resolves.toBeNull()
  })

  it('deletes a value', async () => {
    await keychainSecretStore.set(SECRET_KEYS.accessToken, 'jwt-value')

    await keychainSecretStore.remove(SECRET_KEYS.accessToken)

    await expect(keychainSecretStore.get(SECRET_KEYS.accessToken)).resolves.toBeNull()
    expect(__keychain.services()).toHaveLength(0)
  })

  it('keeps each key in its own service, so two secrets cannot collide', async () => {
    await keychainSecretStore.set('capri.auth.accessToken', 'token-value')
    await keychainSecretStore.set('capri.other.secret', 'other-value')

    await expect(keychainSecretStore.get('capri.auth.accessToken')).resolves.toBe('token-value')
    await expect(keychainSecretStore.get('capri.other.secret')).resolves.toBe('other-value')
    expect(__keychain.services()).toHaveLength(2)
  })

  it('writes under the service name the widget extension queries for', async () => {
    await keychainSecretStore.set(SECRET_KEYS.accessToken, 'jwt-value')

    const service = keychainServiceFor(SECRET_KEYS.accessToken)
    expect(__keychain.rawValue(service)).toBe('jwt-value')
  })

  describe('security options', () => {
    it('restricts the item to this device, unlocked', async () => {
      await keychainSecretStore.set(SECRET_KEYS.accessToken, 'jwt-value')

      // THIS_DEVICE_ONLY keeps the token out of an iCloud Keychain backup, so it
      // cannot ride a restore onto another device.
      expect(__keychain.writes()[0]?.accessible).toBe('AccessibleWhenUnlockedThisDeviceOnly')
    })

    it('names Android Keystore AES-GCM without a biometric prompt', async () => {
      await keychainSecretStore.set(SECRET_KEYS.accessToken, 'jwt-value')

      // The biometric variants would prompt on every read and break silent
      // restore at launch. Left unset, Android silently picks its own default.
      expect(__keychain.writes()[0]?.storage).toBe('KeystoreAESGCM_NoAuth')
    })

    it('does not send write-only options on a read', async () => {
      await keychainSecretStore.get(SECRET_KEYS.accessToken)

      // `accessible` and `storage` describe how to store something; passing them
      // to a read is meaningless and was the previous behaviour.
      expect(__keychain.reads()[0]?.accessible).toBeUndefined()
      expect(__keychain.reads()[0]?.storage).toBeUndefined()
    })
  })

  describe('when the platform fails', () => {
    it('reads as "no session" rather than throwing on the launch path', async () => {
      // A locked or corrupt entry must not crash the app before it can render.
      __keychain.failNextRead(new Error('errSecInteractionNotAllowed'))

      await expect(keychainSecretStore.get(SECRET_KEYS.accessToken)).resolves.toBeNull()
    })

    it('completes a delete even when the platform rejects it', async () => {
      // Sign-out must always finish; a missing entry is the usual cause.
      __keychain.failNextRemove(new Error('errSecItemNotFound'))

      await expect(keychainSecretStore.remove(SECRET_KEYS.accessToken)).resolves.toBeUndefined()
    })

    it('propagates a failed write — a session that was not stored is a real error', async () => {
      // Deliberately asymmetric to reads and deletes: a swallowed write would
      // leave the user signed in for this launch and signed out on the next,
      // with nothing to explain it. The caller must hear about it.
      __keychain.failNextWrite(new Error('errSecDuplicateItem'))

      await expect(keychainSecretStore.set(SECRET_KEYS.accessToken, 'jwt-value')).rejects.toThrow(
        'errSecDuplicateItem',
      )
    })
  })
})
