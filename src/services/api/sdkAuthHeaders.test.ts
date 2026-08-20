import { createAuthModule } from '@base44/sdk/dist/modules/auth'
import type { AxiosInstance } from 'axios'

/**
 * Guards the patch in `patches/@base44+sdk+0.8.41.patch`.
 *
 * `applyToken(null)` — the app's only way to un-authenticate the client — is
 * worthless unless the SDK clears its headers. Upstream's `setToken` returned
 * early on a falsy token, so it never did.
 *
 * `createAuthModule` takes both axios clients as arguments, so the patched
 * behaviour can be asserted directly with two fakes: no network, no mocking of
 * axios, and no reliance on internals the client does not expose.
 *
 * If a future SDK bump drops the patch, `postinstall` fails first; if the patch
 * applies but upstream has changed the behaviour, these fail instead.
 */

type Headers = Record<string, string | undefined>

const fakeClient = () => ({ defaults: { headers: { common: {} as Headers } } })

/** The module needs an AxiosInstance; only `defaults.headers.common` is touched. */
const asAxios = (fake: ReturnType<typeof fakeClient>): AxiosInstance =>
  fake as unknown as AxiosInstance

const build = () => {
  const entities = fakeClient()
  const functions = fakeClient()
  const auth = createAuthModule(asAxios(entities), asAxios(functions), 'test-app', {
    appBaseUrl: 'https://example.test',
    serverUrl: 'https://example.test',
  })
  return { auth, entities, functions }
}

const authorizationOf = (client: ReturnType<typeof fakeClient>) =>
  client.defaults.headers.common.Authorization

describe('SDK auth headers', () => {
  it('authenticates both clients — entities and functions', () => {
    const { auth, entities, functions } = build()

    auth.setToken('token-abc', false)

    expect(authorizationOf(entities)).toBe('Bearer token-abc')
    // functions.invoke() authenticates from this header alone, so it matters as
    // much as the entities one.
    expect(authorizationOf(functions)).toBe('Bearer token-abc')
  })

  it('clears both clients when the token is emptied — the patched behaviour', () => {
    const { auth, entities, functions } = build()
    auth.setToken('token-abc', false)

    // What applyToken(null) does. Unpatched, this returned early and left both
    // clients authenticated after sign-out.
    auth.setToken('', false)

    expect(authorizationOf(entities)).toBeUndefined()
    expect(authorizationOf(functions)).toBeUndefined()
  })

  it("does not resurrect a header once cleared, even if it is cleared twice", () => {
    const { auth, entities, functions } = build()
    auth.setToken('token-abc', false)

    auth.setToken('', false)
    auth.setToken('', false)

    expect(authorizationOf(entities)).toBeUndefined()
    expect(authorizationOf(functions)).toBeUndefined()
  })

  /**
   * Characterisation of the vendor, and the whole reason the patch exists.
   *
   * `logout()` is a browser routine: it reaches for `window.location.href` to
   * redirect, which exists in neither React Native nor here — so it throws
   * part-way through. That is why `signOut` wraps it in a try/catch, and the
   * catch is load-bearing rather than defensive decoration.
   *
   * By the time it throws it has cleared the entities client and never touched
   * the functions one. If this test ever fails because the functions header is
   * also gone, upstream has fixed the bug and the patch can be dropped.
   */
  it('logout throws outside a browser, and leaves the functions client authenticated', () => {
    const { auth, entities, functions } = build()
    auth.setToken('token-abc', false)

    expect(() => {
      auth.logout()
    }).toThrow(/href/)

    expect(authorizationOf(entities)).toBeUndefined()
    expect(authorizationOf(functions)).toBe('Bearer token-abc')
  })
})
