/**
 * Jest setup. Native modules are stubbed here so `src/lib` stays testable
 * without a simulator (guidelines §6).
 *
 * Stubs return resolved promises rather than being `async`, so the
 * require-await rule stays on for real source files.
 */

/**
 * A stateful Keychain, not a stub.
 *
 * This used to answer every read with `false`, which meant a token could be
 * written and still read back as absent — so `secretStore` and everything above
 * it were untestable. The fake keeps entries per service like the real thing;
 * `__keychain` in the same module exposes what was stored and with which options.
 */
jest.mock('react-native-keychain', () => {
  // Resolved inside the factory because jest hoists it above every import.
  const { keychainFake } = jest.requireActual<{ keychainFake: unknown }>(
    '@/services/storage/testing/keychainFake',
  )
  return keychainFake
})

jest.mock('react-native-mmkv', () => {
  const store = new Map<string, unknown>()
  return {
    createMMKV: jest.fn(() => ({
      getString: (k: string) => store.get(k) as string | undefined,
      getBoolean: (k: string) => store.get(k) as boolean | undefined,
      set: (k: string, v: unknown) => void store.set(k, v),
      remove: (k: string) => store.delete(k),
    })),
  }
})

// @react-native-firebase v26 modular API: free functions taking an instance.
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  getCrashlytics: jest.fn(() => ({})),
  log: jest.fn(),
  recordError: jest.fn(),
  setUserId: jest.fn(() => Promise.resolve(null)),
  setAttributes: jest.fn(() => Promise.resolve(null)),
  setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve(null)),
}))

jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: { hide: jest.fn(() => Promise.resolve()), isVisible: jest.fn(() => Promise.resolve(false)) },
}))

jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn(() => Promise.resolve(true)),
    openAuth: jest.fn(() => Promise.resolve({ type: 'cancel' })),
  },
}))

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons')

/**
 * Unistyles is Nitro-backed, so importing it in node throws
 * `'NitroModules' could not be found`. Because `store/index.ts` re-exports
 * themeStore, that reached anything importing the store barrel — including
 * hooks with no styling of their own.
 *
 * Only the three APIs the app actually uses are stubbed. `useUnistyles` returns
 * no theme: rendering a themed component under test will need the real theme
 * registered here first.
 */
jest.mock('react-native-unistyles', () => ({
  StyleSheet: {
    create: (styles: unknown) => (typeof styles === 'function' ? {} : styles),
  },
  UnistylesRuntime: {
    colorScheme: 'light',
    themeName: 'slateLight',
    setTheme: jest.fn(),
    setAdaptiveThemes: jest.fn(),
  },
  useUnistyles: jest.fn(() => ({})),
}))
